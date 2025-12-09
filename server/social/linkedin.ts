/**
 * LinkedIn API Adapter
 * 
 * Handles OAuth 2.0 authentication and posting to LinkedIn.
 * 
 * Required Environment Variables:
 * - LINKEDIN_CLIENT_ID: Your LinkedIn app client ID
 * - LINKEDIN_CLIENT_SECRET: Your LinkedIn app client secret
 * 
 * Required Scopes:
 * - openid
 * - profile
 * - email
 * - w_member_social (for posting)
 * 
 * To set up:
 * 1. Go to https://www.linkedin.com/developers/
 * 2. Create a new app
 * 3. Request access to "Share on LinkedIn" product
 * 4. Add your redirect URI
 * 5. Copy your Client ID and Client Secret
 */

import type { SocialAdapter, SocialPost, PostResult, SocialAccountTokens } from "./index";

const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_API_URL = "https://api.linkedin.com/v2";

export class LinkedInAdapter implements SocialAdapter {
  platform = "linkedin" as const;
  
  private clientId: string;
  private clientSecret: string;
  
  constructor() {
    this.clientId = process.env.LINKEDIN_CLIENT_ID || "";
    this.clientSecret = process.env.LINKEDIN_CLIENT_SECRET || "";
  }
  
  /**
   * Get the OAuth authorization URL for LinkedIn
   */
  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: redirectUri,
      state: state,
      scope: "openid profile email w_member_social"
    });
    
    return `${LINKEDIN_AUTH_URL}?${params.toString()}`;
  }
  
  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<SocialAccountTokens & { accountId: string; accountName: string }> {
    // Exchange code for tokens
    const tokenResponse = await fetch(LINKEDIN_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
        client_id: this.clientId,
        client_secret: this.clientSecret
      })
    });
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Failed to exchange code for tokens: ${error}`);
    }
    
    const tokenData = await tokenResponse.json();
    
    // Get user profile
    const profileResponse = await fetch(`${LINKEDIN_API_URL}/userinfo`, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    });
    
    if (!profileResponse.ok) {
      throw new Error("Failed to get user profile");
    }
    
    const profile = await profileResponse.json();
    
    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      accountId: profile.sub,
      accountName: profile.name || profile.email
    };
  }
  
  /**
   * Refresh the access token
   */
  async refreshToken(refreshToken: string): Promise<SocialAccountTokens> {
    const response = await fetch(LINKEDIN_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret
      })
    });
    
    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }
    
    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000)
    };
  }
  
  /**
   * Validate that the tokens are still valid
   */
  async validateTokens(tokens: SocialAccountTokens): Promise<boolean> {
    try {
      const response = await fetch(`${LINKEDIN_API_URL}/userinfo`, {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`
        }
      });
      
      return response.ok;
    } catch {
      return false;
    }
  }
  
  /**
   * Post content to LinkedIn
   */
  async post(content: SocialPost, tokens: SocialAccountTokens): Promise<PostResult> {
    try {
      // First, get the user's URN
      const profileResponse = await fetch(`${LINKEDIN_API_URL}/userinfo`, {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`
        }
      });
      
      if (!profileResponse.ok) {
        return { success: false, error: "Failed to get user profile" };
      }
      
      const profile = await profileResponse.json();
      const authorUrn = `urn:li:person:${profile.sub}`;
      
      // Prepare the post payload
      const postPayload: Record<string, unknown> = {
        author: authorUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: content.content
            },
            shareMediaCategory: content.mediaUrls?.length ? "IMAGE" : "NONE"
          }
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        }
      };
      
      // If there are media URLs, we need to upload them first
      if (content.mediaUrls && content.mediaUrls.length > 0) {
        // Note: LinkedIn requires a multi-step process for media uploads
        // 1. Register the upload
        // 2. Upload the media
        // 3. Include the asset URN in the post
        // This is simplified for the framework - full implementation would handle this
        console.warn("LinkedIn media uploads require additional implementation");
      }
      
      // Create the post
      const postResponse = await fetch(`${LINKEDIN_API_URL}/ugcPosts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0"
        },
        body: JSON.stringify(postPayload)
      });
      
      if (!postResponse.ok) {
        const error = await postResponse.text();
        return { success: false, error: `Failed to create post: ${error}` };
      }
      
      const postData = await postResponse.json();
      
      return {
        success: true,
        postId: postData.id,
        postUrl: `https://www.linkedin.com/feed/update/${postData.id}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
