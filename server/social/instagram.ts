/**
 * Instagram API Adapter
 * 
 * Handles OAuth 2.0 authentication and posting to Instagram.
 * Uses the Instagram Graph API (requires a Facebook Business account).
 * 
 * Required Environment Variables:
 * - FACEBOOK_APP_ID: Your Facebook app ID (Instagram uses Facebook's API)
 * - FACEBOOK_APP_SECRET: Your Facebook app secret
 * 
 * Required Permissions:
 * - instagram_basic
 * - instagram_content_publish
 * - pages_read_engagement
 * 
 * To set up:
 * 1. Go to https://developers.facebook.com/
 * 2. Create a new app (Business type)
 * 3. Add Instagram Graph API product
 * 4. Connect your Instagram Business/Creator account to a Facebook Page
 * 5. Request necessary permissions through App Review
 * 
 * Note: Only Instagram Business/Creator accounts can use the API.
 * Personal accounts are not supported.
 */

import type { SocialAdapter, SocialPost, PostResult, SocialAccountTokens } from "./index";

const FACEBOOK_AUTH_URL = "https://www.facebook.com/v18.0/dialog/oauth";
const FACEBOOK_TOKEN_URL = "https://graph.facebook.com/v18.0/oauth/access_token";
const FACEBOOK_API_URL = "https://graph.facebook.com/v18.0";

export class InstagramAdapter implements SocialAdapter {
  platform = "instagram" as const;
  
  private appId: string;
  private appSecret: string;
  
  constructor() {
    this.appId = process.env.FACEBOOK_APP_ID || "";
    this.appSecret = process.env.FACEBOOK_APP_SECRET || "";
  }
  
  /**
   * Get the OAuth authorization URL for Instagram (via Facebook)
   */
  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: redirectUri,
      state: state,
      scope: "instagram_basic,instagram_content_publish,pages_read_engagement,pages_show_list",
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
    
    // Get Instagram account ID through Facebook Pages
    const pagesResponse = await fetch(
      `${FACEBOOK_API_URL}/me/accounts?fields=instagram_business_account{id,username}&access_token=${longLivedData.access_token}`
    );
    
    if (!pagesResponse.ok) {
      throw new Error("Failed to get Instagram account");
    }
    
    const pagesData = await pagesResponse.json();
    
    // Find the first page with an Instagram account
    let instagramAccount = null;
    for (const page of pagesData.data || []) {
      if (page.instagram_business_account) {
        instagramAccount = page.instagram_business_account;
        break;
      }
    }
    
    if (!instagramAccount) {
      throw new Error("No Instagram Business account found. Please connect an Instagram Business or Creator account to your Facebook Page.");
    }
    
    return {
      accessToken: longLivedData.access_token,
      tokenExpiresAt: new Date(Date.now() + (longLivedData.expires_in || 5184000) * 1000),
      accountId: instagramAccount.id,
      accountName: instagramAccount.username
    };
  }
  
  /**
   * Refresh the access token
   */
  async refreshToken(refreshToken: string): Promise<SocialAccountTokens> {
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
   * Post content to Instagram
   * 
   * Note: Instagram API requires images to be hosted at a public URL.
   * The content publishing flow is:
   * 1. Create a media container with the image URL
   * 2. Publish the container
   */
  async post(content: SocialPost, tokens: SocialAccountTokens): Promise<PostResult> {
    try {
      // Instagram requires at least one image
      if (!content.mediaUrls || content.mediaUrls.length === 0) {
        return { 
          success: false, 
          error: "Instagram requires at least one image. Please add an image to your post." 
        };
      }
      
      // Get the Instagram account ID
      const pagesResponse = await fetch(
        `${FACEBOOK_API_URL}/me/accounts?fields=instagram_business_account{id}&access_token=${tokens.accessToken}`
      );
      
      if (!pagesResponse.ok) {
        return { success: false, error: "Failed to get Instagram account" };
      }
      
      const pagesData = await pagesResponse.json();
      
      let instagramAccountId = null;
      for (const page of pagesData.data || []) {
        if (page.instagram_business_account) {
          instagramAccountId = page.instagram_business_account.id;
          break;
        }
      }
      
      if (!instagramAccountId) {
        return { success: false, error: "No Instagram Business account found" };
      }
      
      // Step 1: Create media container
      const containerPayload: Record<string, string> = {
        image_url: content.mediaUrls[0],
        caption: content.content,
        access_token: tokens.accessToken
      };
      
      // Add alt text if available
      if (content.altTexts && content.altTexts[content.mediaUrls[0]]) {
        containerPayload.alt_text = content.altTexts[content.mediaUrls[0]];
      }
      
      const containerResponse = await fetch(
        `${FACEBOOK_API_URL}/${instagramAccountId}/media`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: new URLSearchParams(containerPayload)
        }
      );
      
      if (!containerResponse.ok) {
        const error = await containerResponse.text();
        return { success: false, error: `Failed to create media container: ${error}` };
      }
      
      const containerData = await containerResponse.json();
      const containerId = containerData.id;
      
      // Step 2: Publish the container
      const publishResponse = await fetch(
        `${FACEBOOK_API_URL}/${instagramAccountId}/media_publish`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: new URLSearchParams({
            creation_id: containerId,
            access_token: tokens.accessToken
          })
        }
      );
      
      if (!publishResponse.ok) {
        const error = await publishResponse.text();
        return { success: false, error: `Failed to publish post: ${error}` };
      }
      
      const publishData = await publishResponse.json();
      
      // Get the permalink
      const mediaResponse = await fetch(
        `${FACEBOOK_API_URL}/${publishData.id}?fields=permalink&access_token=${tokens.accessToken}`
      );
      
      let postUrl = `https://www.instagram.com/`;
      if (mediaResponse.ok) {
        const mediaData = await mediaResponse.json();
        postUrl = mediaData.permalink || postUrl;
      }
      
      return {
        success: true,
        postId: publishData.id,
        postUrl: postUrl
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
