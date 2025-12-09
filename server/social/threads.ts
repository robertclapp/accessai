/**
 * Threads API Adapter
 * 
 * Handles OAuth 2.0 authentication and posting to Threads (Meta).
 * 
 * Required Environment Variables:
 * - THREADS_APP_ID: Your Threads app ID (from Meta App Dashboard)
 * - THREADS_APP_SECRET: Your Threads app secret
 * 
 * Required Scopes:
 * - threads_basic: Required for all endpoints
 * - threads_content_publish: Required for posting content
 * 
 * To set up:
 * 1. Go to https://developers.facebook.com/
 * 2. Create a new app with the Threads use case
 * 3. Add your redirect URI
 * 4. Copy your Threads App ID and App Secret
 * 
 * API Documentation: https://developers.facebook.com/docs/threads/
 * 
 * Note: Threads API has specific requirements:
 * - 500 character limit for text posts
 * - 250 posts per 24 hours rate limit
 * - Media must be hosted on a public server
 * - Max 5 links per post (as of Dec 22, 2025)
 */

import type { SocialAdapter, SocialPost, PostResult, SocialAccountTokens } from "./index";

const THREADS_AUTH_URL = "https://threads.net/oauth/authorize";
const THREADS_TOKEN_URL = "https://graph.threads.net/oauth/access_token";
const THREADS_API_URL = "https://graph.threads.net/v1.0";
const THREADS_LONG_LIVED_TOKEN_URL = "https://graph.threads.net/access_token";
const THREADS_REFRESH_TOKEN_URL = "https://graph.threads.net/refresh_access_token";

/** Threads character limit for text posts */
const THREADS_CHAR_LIMIT = 500;

/** Threads rate limit: 250 posts per 24 hours */
const THREADS_RATE_LIMIT = 250;

export class ThreadsAdapter implements SocialAdapter {
  platform = "threads" as const;
  
  private appId: string;
  private appSecret: string;
  
  constructor() {
    this.appId = process.env.THREADS_APP_ID || "";
    this.appSecret = process.env.THREADS_APP_SECRET || "";
  }
  
  /**
   * Get the OAuth authorization URL for Threads
   */
  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: redirectUri,
      scope: "threads_basic,threads_content_publish",
      response_type: "code",
      state: state
    });
    
    return `${THREADS_AUTH_URL}?${params.toString()}`;
  }
  
  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<SocialAccountTokens & { accountId: string; accountName: string }> {
    // Step 1: Exchange code for short-lived token
    const tokenResponse = await fetch(THREADS_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: this.appId,
        client_secret: this.appSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code: code
      })
    });
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Failed to exchange code for tokens: ${error}`);
    }
    
    const tokenData = await tokenResponse.json();
    
    // Step 2: Exchange short-lived token for long-lived token (60 days)
    const longLivedTokenResponse = await fetch(
      `${THREADS_LONG_LIVED_TOKEN_URL}?grant_type=th_exchange_token&client_secret=${this.appSecret}&access_token=${tokenData.access_token}`,
      { method: "GET" }
    );
    
    let accessToken = tokenData.access_token;
    let expiresIn = 3600; // 1 hour for short-lived
    
    if (longLivedTokenResponse.ok) {
      const longLivedData = await longLivedTokenResponse.json();
      accessToken = longLivedData.access_token;
      expiresIn = longLivedData.expires_in || 5184000; // 60 days default
    }
    
    // Step 3: Get user profile
    const profileResponse = await fetch(
      `${THREADS_API_URL}/me?fields=id,username,name,threads_profile_picture_url&access_token=${accessToken}`
    );
    
    if (!profileResponse.ok) {
      throw new Error("Failed to get user profile");
    }
    
    const profileData = await profileResponse.json();
    
    return {
      accessToken: accessToken,
      refreshToken: accessToken, // Threads uses the same token for refresh
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      accountId: profileData.id || tokenData.user_id,
      accountName: profileData.username || profileData.name || "Threads User"
    };
  }
  
  /**
   * Refresh the access token
   * Threads long-lived tokens can be refreshed if they haven't expired
   */
  async refreshToken(currentToken: string): Promise<SocialAccountTokens> {
    const response = await fetch(
      `${THREADS_REFRESH_TOKEN_URL}?grant_type=th_refresh_token&access_token=${currentToken}`,
      { method: "GET" }
    );
    
    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }
    
    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      refreshToken: data.access_token, // Threads uses same token
      tokenExpiresAt: new Date(Date.now() + (data.expires_in || 5184000) * 1000)
    };
  }
  
  /**
   * Validate that the tokens are still valid
   */
  async validateTokens(tokens: SocialAccountTokens): Promise<boolean> {
    try {
      const response = await fetch(
        `${THREADS_API_URL}/me?fields=id&access_token=${tokens.accessToken}`
      );
      
      return response.ok;
    } catch {
      return false;
    }
  }
  
  /**
   * Post content to Threads
   * 
   * Threads publishing is a two-step process:
   * 1. Create a media container
   * 2. Publish the container
   */
  async post(content: SocialPost, tokens: SocialAccountTokens): Promise<PostResult> {
    try {
      // Get user ID first
      const meResponse = await fetch(
        `${THREADS_API_URL}/me?fields=id&access_token=${tokens.accessToken}`
      );
      
      if (!meResponse.ok) {
        return { success: false, error: "Failed to get user ID" };
      }
      
      const meData = await meResponse.json();
      const userId = meData.id;
      
      // Prepare the post content
      let postText = content.content;
      
      // Enforce character limit
      if (postText.length > THREADS_CHAR_LIMIT) {
        postText = postText.substring(0, THREADS_CHAR_LIMIT - 3) + "...";
      }
      
      // Add hashtags if provided (Threads supports topic tags)
      if (content.hashtags && content.hashtags.length > 0) {
        const hashtagText = content.hashtags
          .map(tag => tag.startsWith("#") ? tag : `#${tag}`)
          .join(" ");
        
        // Only add if within limit
        if (postText.length + hashtagText.length + 2 <= THREADS_CHAR_LIMIT) {
          postText = `${postText}\n\n${hashtagText}`;
        }
      }
      
      // Step 1: Create media container
      const containerParams: Record<string, string> = {
        text: postText,
        access_token: tokens.accessToken
      };
      
      // Determine media type
      if (content.mediaUrls && content.mediaUrls.length > 0) {
        if (content.mediaUrls.length === 1) {
          // Single image or video
          const mediaUrl = content.mediaUrls[0];
          const isVideo = /\.(mp4|mov|avi|webm)$/i.test(mediaUrl);
          
          containerParams.media_type = isVideo ? "VIDEO" : "IMAGE";
          containerParams[isVideo ? "video_url" : "image_url"] = mediaUrl;
        } else {
          // Carousel (multiple images/videos)
          // For carousel, we need to create individual containers first
          const childIds: string[] = [];
          
          for (const mediaUrl of content.mediaUrls.slice(0, 20)) { // Max 20 items
            const isVideo = /\.(mp4|mov|avi|webm)$/i.test(mediaUrl);
            
            const childParams = new URLSearchParams({
              is_carousel_item: "true",
              media_type: isVideo ? "VIDEO" : "IMAGE",
              [isVideo ? "video_url" : "image_url"]: mediaUrl,
              access_token: tokens.accessToken
            });
            
            const childResponse = await fetch(
              `${THREADS_API_URL}/${userId}/threads`,
              {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: childParams
              }
            );
            
            if (!childResponse.ok) {
              const error = await childResponse.text();
              return { success: false, error: `Failed to create carousel item: ${error}` };
            }
            
            const childData = await childResponse.json();
            childIds.push(childData.id);
          }
          
          // Create carousel container
          containerParams.media_type = "CAROUSEL";
          containerParams.children = childIds.join(",");
          delete containerParams.text; // Text goes in carousel container
          containerParams.text = postText;
        }
      } else {
        // Text-only post
        containerParams.media_type = "TEXT";
      }
      
      const containerResponse = await fetch(
        `${THREADS_API_URL}/${userId}/threads`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(containerParams)
        }
      );
      
      if (!containerResponse.ok) {
        const error = await containerResponse.text();
        return { success: false, error: `Failed to create Threads container: ${error}` };
      }
      
      const containerData = await containerResponse.json();
      const containerId = containerData.id;
      
      // Wait for media processing (recommended 30 seconds for media, less for text)
      const hasMedia = content.mediaUrls && content.mediaUrls.length > 0;
      const waitTime = hasMedia ? 30000 : 2000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Step 2: Publish the container
      const publishResponse = await fetch(
        `${THREADS_API_URL}/${userId}/threads_publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            creation_id: containerId,
            access_token: tokens.accessToken
          })
        }
      );
      
      if (!publishResponse.ok) {
        const error = await publishResponse.text();
        return { success: false, error: `Failed to publish Threads post: ${error}` };
      }
      
      const publishData = await publishResponse.json();
      
      return {
        success: true,
        postId: publishData.id,
        postUrl: `https://www.threads.net/@me/post/${publishData.id}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
