/**
 * Twitter/X API Adapter
 * 
 * Handles OAuth 2.0 authentication and posting to Twitter/X.
 * 
 * Required Environment Variables:
 * - TWITTER_CLIENT_ID: Your Twitter app client ID
 * - TWITTER_CLIENT_SECRET: Your Twitter app client secret
 * 
 * Required Scopes:
 * - tweet.read
 * - tweet.write
 * - users.read
 * - offline.access (for refresh tokens)
 * 
 * To set up:
 * 1. Go to https://developer.twitter.com/
 * 2. Create a new project and app
 * 3. Enable OAuth 2.0 with PKCE
 * 4. Add your redirect URI
 * 5. Copy your Client ID and Client Secret
 * 
 * Note: Twitter API access requires a developer account and may have usage limits.
 */

import type { SocialAdapter, SocialPost, PostResult, SocialAccountTokens } from "./index";

const TWITTER_AUTH_URL = "https://twitter.com/i/oauth2/authorize";
const TWITTER_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const TWITTER_API_URL = "https://api.twitter.com/2";

export class TwitterAdapter implements SocialAdapter {
  platform = "twitter" as const;
  
  private clientId: string;
  private clientSecret: string;
  
  constructor() {
    this.clientId = process.env.TWITTER_CLIENT_ID || "";
    this.clientSecret = process.env.TWITTER_CLIENT_SECRET || "";
  }
  
  /**
   * Get the OAuth authorization URL for Twitter
   */
  getAuthUrl(redirectUri: string, state: string): string {
    // Twitter requires PKCE - in production, you'd generate and store a code_verifier
    const codeChallenge = state; // Simplified - use proper PKCE in production
    
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: redirectUri,
      state: state,
      scope: "tweet.read tweet.write users.read offline.access",
      code_challenge: codeChallenge,
      code_challenge_method: "plain" // Use S256 in production
    });
    
    return `${TWITTER_AUTH_URL}?${params.toString()}`;
  }
  
  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<SocialAccountTokens & { accountId: string; accountName: string }> {
    const basicAuth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
    
    const tokenResponse = await fetch(TWITTER_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
        code_verifier: "challenge" // Should match code_challenge from auth URL
      })
    });
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Failed to exchange code for tokens: ${error}`);
    }
    
    const tokenData = await tokenResponse.json();
    
    // Get user profile
    const profileResponse = await fetch(`${TWITTER_API_URL}/users/me`, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    });
    
    if (!profileResponse.ok) {
      throw new Error("Failed to get user profile");
    }
    
    const profileData = await profileResponse.json();
    
    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      accountId: profileData.data.id,
      accountName: profileData.data.username
    };
  }
  
  /**
   * Refresh the access token
   */
  async refreshToken(refreshToken: string): Promise<SocialAccountTokens> {
    const basicAuth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
    
    const response = await fetch(TWITTER_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken
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
      const response = await fetch(`${TWITTER_API_URL}/users/me`, {
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
   * Post content to Twitter
   */
  async post(content: SocialPost, tokens: SocialAccountTokens): Promise<PostResult> {
    try {
      // Prepare the tweet payload
      const tweetPayload: Record<string, unknown> = {
        text: content.content
      };
      
      // If there are media URLs, we need to upload them first
      if (content.mediaUrls && content.mediaUrls.length > 0) {
        // Note: Twitter media uploads require the v1.1 API
        // This is a simplified version - full implementation would handle media
        console.warn("Twitter media uploads require v1.1 API implementation");
      }
      
      // Create the tweet
      const tweetResponse = await fetch(`${TWITTER_API_URL}/tweets`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(tweetPayload)
      });
      
      if (!tweetResponse.ok) {
        const error = await tweetResponse.text();
        return { success: false, error: `Failed to create tweet: ${error}` };
      }
      
      const tweetData = await tweetResponse.json();
      
      return {
        success: true,
        postId: tweetData.data.id,
        postUrl: `https://twitter.com/i/web/status/${tweetData.data.id}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
