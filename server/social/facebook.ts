/**
 * Facebook API Adapter
 * 
 * Handles OAuth 2.0 authentication and posting to Facebook.
 * 
 * Required Environment Variables:
 * - FACEBOOK_APP_ID: Your Facebook app ID
 * - FACEBOOK_APP_SECRET: Your Facebook app secret
 * 
 * Required Permissions:
 * - pages_manage_posts (for page posting)
 * - pages_read_engagement
 * - public_profile
 * 
 * To set up:
 * 1. Go to https://developers.facebook.com/
 * 2. Create a new app (Business type)
 * 3. Add Facebook Login product
 * 4. Configure OAuth settings and redirect URIs
 * 5. Request necessary permissions through App Review
 * 
 * Note: Personal profile posting is limited. Most use cases require Page posting.
 */

import type { SocialAdapter, SocialPost, PostResult, SocialAccountTokens } from "./index";

const FACEBOOK_AUTH_URL = "https://www.facebook.com/v18.0/dialog/oauth";
const FACEBOOK_TOKEN_URL = "https://graph.facebook.com/v18.0/oauth/access_token";
const FACEBOOK_API_URL = "https://graph.facebook.com/v18.0";

export class FacebookAdapter implements SocialAdapter {
  platform = "facebook" as const;
  
  private appId: string;
  private appSecret: string;
  
  constructor() {
    this.appId = process.env.FACEBOOK_APP_ID || "";
    this.appSecret = process.env.FACEBOOK_APP_SECRET || "";
  }
  
  /**
   * Get the OAuth authorization URL for Facebook
   */
  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: redirectUri,
      state: state,
      scope: "pages_manage_posts,pages_read_engagement,public_profile",
      response_type: "code"
    });
    
    return `${FACEBOOK_AUTH_URL}?${params.toString()}`;
  }
  
  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<SocialAccountTokens & { accountId: string; accountName: string }> {
    // Exchange code for short-lived token
    const tokenResponse = await fetch(`${FACEBOOK_TOKEN_URL}?${new URLSearchParams({
      client_id: this.appId,
      client_secret: this.appSecret,
      redirect_uri: redirectUri,
      code: code
    })}`);
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Failed to exchange code for tokens: ${error}`);
    }
    
    const tokenData = await tokenResponse.json();
    
    // Exchange for long-lived token
    const longLivedResponse = await fetch(`${FACEBOOK_TOKEN_URL}?${new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: this.appId,
      client_secret: this.appSecret,
      fb_exchange_token: tokenData.access_token
    })}`);
    
    const longLivedData = await longLivedResponse.json();
    
    // Get user profile
    const profileResponse = await fetch(`${FACEBOOK_API_URL}/me?fields=id,name&access_token=${longLivedData.access_token}`);
    
    if (!profileResponse.ok) {
      throw new Error("Failed to get user profile");
    }
    
    const profile = await profileResponse.json();
    
    return {
      accessToken: longLivedData.access_token,
      tokenExpiresAt: new Date(Date.now() + (longLivedData.expires_in || 5184000) * 1000), // ~60 days
      accountId: profile.id,
      accountName: profile.name
    };
  }
  
  /**
   * Refresh the access token (Facebook uses long-lived tokens that need to be exchanged)
   */
  async refreshToken(refreshToken: string): Promise<SocialAccountTokens> {
    // Facebook doesn't use refresh tokens in the traditional sense
    // Long-lived tokens can be exchanged for new ones before expiry
    const response = await fetch(`${FACEBOOK_TOKEN_URL}?${new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: this.appId,
      client_secret: this.appSecret,
      fb_exchange_token: refreshToken
    })}`);
    
    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }
    
    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      tokenExpiresAt: new Date(Date.now() + (data.expires_in || 5184000) * 1000)
    };
  }
  
  /**
   * Validate that the tokens are still valid
   */
  async validateTokens(tokens: SocialAccountTokens): Promise<boolean> {
    try {
      const response = await fetch(`${FACEBOOK_API_URL}/me?access_token=${tokens.accessToken}`);
      return response.ok;
    } catch {
      return false;
    }
  }
  
  /**
   * Post content to Facebook (Page)
   */
  async post(content: SocialPost, tokens: SocialAccountTokens): Promise<PostResult> {
    try {
      // First, get the user's pages
      const pagesResponse = await fetch(`${FACEBOOK_API_URL}/me/accounts?access_token=${tokens.accessToken}`);
      
      if (!pagesResponse.ok) {
        return { success: false, error: "Failed to get user pages" };
      }
      
      const pagesData = await pagesResponse.json();
      
      if (!pagesData.data || pagesData.data.length === 0) {
        return { success: false, error: "No Facebook pages found. Please connect a Facebook Page." };
      }
      
      // Use the first page (in production, let user select)
      const page = pagesData.data[0];
      const pageAccessToken = page.access_token;
      const pageId = page.id;
      
      // Prepare the post payload
      let postUrl = `${FACEBOOK_API_URL}/${pageId}/feed`;
      const postPayload: Record<string, string> = {
        message: content.content,
        access_token: pageAccessToken
      };
      
      // If there's a media URL, use photo endpoint
      if (content.mediaUrls && content.mediaUrls.length > 0) {
        postUrl = `${FACEBOOK_API_URL}/${pageId}/photos`;
        postPayload.url = content.mediaUrls[0];
        
        // Add alt text if available
        if (content.altTexts && content.altTexts[content.mediaUrls[0]]) {
          // Facebook doesn't have direct alt text support in the API
          // Alt text would be added through the message or as a comment
        }
      }
      
      // Create the post
      const postResponse = await fetch(postUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams(postPayload)
      });
      
      if (!postResponse.ok) {
        const error = await postResponse.text();
        return { success: false, error: `Failed to create post: ${error}` };
      }
      
      const postData = await postResponse.json();
      
      return {
        success: true,
        postId: postData.id,
        postUrl: `https://www.facebook.com/${postData.id}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
