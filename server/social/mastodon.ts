/**
 * Mastodon API Adapter
 * 
 * Handles OAuth 2.0 authentication and posting to Mastodon instances.
 * Mastodon is a federated platform, so each instance has its own API endpoint.
 * 
 * Required Environment Variables:
 * - MASTODON_INSTANCE_URL: The Mastodon instance URL (e.g., https://mastodon.social)
 * - MASTODON_CLIENT_ID: Your Mastodon app client ID
 * - MASTODON_CLIENT_SECRET: Your Mastodon app client secret
 * 
 * Required Scopes:
 * - read
 * - write
 * 
 * To set up:
 * 1. Go to your Mastodon instance's developer settings
 * 2. Create a new application
 * 3. Set the redirect URI to your callback URL
 * 4. Copy your Client ID and Client Secret
 * 
 * Note: Mastodon requires per-instance app registration.
 */

import type { SocialAdapter, SocialPost, PostResult, SocialAccountTokens } from "./index";

const MASTODON_CHAR_LIMIT = 500; // Default limit, can vary by instance

export class MastodonAdapter implements SocialAdapter {
  platform = "mastodon" as const;
  
  private instanceUrl: string;
  private clientId: string;
  private clientSecret: string;
  
  constructor() {
    this.instanceUrl = (process.env.MASTODON_INSTANCE_URL || "https://mastodon.social").replace(/\/$/, "");
    this.clientId = process.env.MASTODON_CLIENT_ID || "";
    this.clientSecret = process.env.MASTODON_CLIENT_SECRET || "";
  }
  
  /**
   * Get the OAuth authorization URL for Mastodon
   */
  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "read write",
      state: state,
    });
    
    return `${this.instanceUrl}/oauth/authorize?${params.toString()}`;
  }
  
  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<SocialAccountTokens & { accountId: string; accountName: string }> {
    const tokenResponse = await fetch(`${this.instanceUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Failed to exchange code for tokens: ${error}`);
    }
    
    const tokenData = await tokenResponse.json();
    
    // Get user profile
    const profileResponse = await fetch(`${this.instanceUrl}/api/v1/accounts/verify_credentials`, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });
    
    if (!profileResponse.ok) {
      throw new Error("Failed to get user profile");
    }
    
    const profile = await profileResponse.json();
    
    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenExpiresAt: tokenData.expires_in 
        ? new Date(Date.now() + tokenData.expires_in * 1000) 
        : undefined,
      accountId: profile.id,
      accountName: profile.display_name || profile.username,
    };
  }
  
  /**
   * Validate that the tokens are still valid
   */
  async validateTokens(tokens: SocialAccountTokens): Promise<boolean> {
    try {
      const response = await fetch(`${this.instanceUrl}/api/v1/accounts/verify_credentials`, {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  /**
   * Refresh the access token (Mastodon tokens typically don't expire)
   */
  async refreshToken(refreshToken: string): Promise<SocialAccountTokens> {
    const response = await fetch(`${this.instanceUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }).toString(),
    });
    
    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }
    
    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      tokenExpiresAt: data.expires_in 
        ? new Date(Date.now() + data.expires_in * 1000) 
        : undefined,
    };
  }
  
  /**
   * Post a status to Mastodon
   */
  async post(content: SocialPost, tokens: SocialAccountTokens): Promise<PostResult> {
    try {
      const formattedContent = this.formatContent(content);
      
      const formData = new URLSearchParams();
      formData.append("status", formattedContent);
      formData.append("visibility", "public");
      
      // Add content warning (spoiler text) if provided
      if (content.contentWarning && content.contentWarning.trim()) {
        formData.append("spoiler_text", content.contentWarning.trim());
      }
      
      // Upload media if present
      if (content.mediaUrls && content.mediaUrls.length > 0) {
        const mediaIds = await this.uploadMedia(content.mediaUrls, tokens.accessToken);
        mediaIds.forEach(id => formData.append("media_ids[]", id));
      }

      const response = await fetch(`${this.instanceUrl}/api/v1/statuses`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return {
          success: false,
          error: error.error || `Mastodon API error: ${response.status}`,
        };
      }

      const result = await response.json();
      
      return {
        success: true,
        postId: result.id,
        postUrl: result.url,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Upload media to Mastodon
   */
  private async uploadMedia(mediaUrls: string[], accessToken: string): Promise<string[]> {
    const mediaIds: string[] = [];
    
    for (const url of mediaUrls) {
      try {
        // Fetch the media file
        const mediaResponse = await fetch(url);
        const blob = await mediaResponse.blob();
        
        const formData = new FormData();
        formData.append("file", blob);
        
        const response = await fetch(`${this.instanceUrl}/api/v2/media`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          mediaIds.push(result.id);
        }
      } catch {
        // Continue with other media if one fails
      }
    }
    
    return mediaIds;
  }

  /**
   * Format content for Mastodon
   */
  private formatContent(content: SocialPost): string {
    let text = content.content;
    
    // Add hashtags if provided
    if (content.hashtags && content.hashtags.length > 0) {
      const hashtagText = content.hashtags
        .map((tag: string) => tag.startsWith("#") ? tag : `#${tag}`)
        .join(" ");
      text = `${text}\n\n${hashtagText}`;
    }
    
    // Truncate if exceeds character limit
    if (text.length > MASTODON_CHAR_LIMIT) {
      text = text.substring(0, MASTODON_CHAR_LIMIT - 3) + "...";
    }
    
    return text;
  }
}

export default MastodonAdapter;
