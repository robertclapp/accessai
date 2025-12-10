/**
 * Bluesky AT Protocol API Adapter
 * 
 * Handles authentication and posting to Bluesky Social.
 * Uses app passwords for authentication (not OAuth).
 * 
 * Required Environment Variables:
 * - BLUESKY_SERVICE_URL: Bluesky service URL (default: https://bsky.social)
 * 
 * To set up:
 * 1. Go to https://bsky.app/settings/app-passwords
 * 2. Create a new app password
 * 3. Use your handle and app password to authenticate
 * 
 * Note: Bluesky uses the AT Protocol (atproto) for all operations.
 * Character limit: 300 graphemes
 */

import type { SocialAdapter, SocialPost, PostResult, SocialAccountTokens } from "./index";

const BLUESKY_SERVICE_URL = process.env.BLUESKY_SERVICE_URL || "https://bsky.social";
const BLUESKY_CHAR_LIMIT = 300;

interface BlueskySession {
  did: string;
  handle: string;
  accessJwt: string;
  refreshJwt: string;
}

interface BlueskyFacet {
  index: {
    byteStart: number;
    byteEnd: number;
  };
  features: Array<{
    $type: string;
    uri?: string;
    did?: string;
    tag?: string;
  }>;
}

export class BlueskyAdapter implements SocialAdapter {
  platform = "bluesky" as const;
  
  /**
   * Get the authentication URL for Bluesky
   * Note: Bluesky uses app passwords, not OAuth, so this returns a settings page URL
   */
  getAuthUrl(_redirectUri: string, _state: string): string {
    // Bluesky doesn't use OAuth - users create app passwords
    // Return the app passwords settings page
    return "https://bsky.app/settings/app-passwords";
  }
  
  /**
   * Create a session with handle and app password
   * This is called differently than OAuth platforms - the "code" parameter
   * contains the app password, and we need the handle from elsewhere
   */
  async exchangeCodeForTokens(
    appPassword: string, 
    handle: string
  ): Promise<SocialAccountTokens & { accountId: string; accountName: string }> {
    const response = await fetch(`${BLUESKY_SERVICE_URL}/xrpc/com.atproto.server.createSession`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        identifier: handle,
        password: appPassword
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create Bluesky session: ${error}`);
    }
    
    const session: BlueskySession = await response.json();
    
    return {
      accessToken: session.accessJwt,
      refreshToken: session.refreshJwt,
      tokenExpiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
      accountId: session.did,
      accountName: session.handle
    };
  }
  
  /**
   * Refresh the access token using the refresh JWT
   */
  async refreshToken(refreshJwt: string): Promise<SocialAccountTokens> {
    const response = await fetch(`${BLUESKY_SERVICE_URL}/xrpc/com.atproto.server.refreshSession`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${refreshJwt}`
      }
    });
    
    if (!response.ok) {
      throw new Error("Failed to refresh Bluesky session");
    }
    
    const session: BlueskySession = await response.json();
    
    return {
      accessToken: session.accessJwt,
      refreshToken: session.refreshJwt,
      tokenExpiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
    };
  }
  
  /**
   * Validate that the tokens are still valid
   */
  async validateTokens(tokens: SocialAccountTokens): Promise<boolean> {
    try {
      const response = await fetch(`${BLUESKY_SERVICE_URL}/xrpc/com.atproto.server.getSession`, {
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
   * Parse URLs from text and create facets for rich text
   */
  private parseUrlFacets(text: string): BlueskyFacet[] {
    const facets: BlueskyFacet[] = [];
    const textBytes = new TextEncoder().encode(text);
    
    // URL regex pattern
    const urlRegex = /https?:\/\/[^\s<>\"{}|\\^`\[\]]+/g;
    let match;
    
    while ((match = urlRegex.exec(text)) !== null) {
      const url = match[0];
      const startIndex = match.index;
      
      // Calculate byte offsets
      const beforeText = text.substring(0, startIndex);
      const byteStart = new TextEncoder().encode(beforeText).length;
      const byteEnd = byteStart + new TextEncoder().encode(url).length;
      
      facets.push({
        index: {
          byteStart,
          byteEnd
        },
        features: [{
          $type: "app.bsky.richtext.facet#link",
          uri: url
        }]
      });
    }
    
    return facets;
  }
  
  /**
   * Parse hashtags from text and create facets
   */
  private parseHashtagFacets(text: string): BlueskyFacet[] {
    const facets: BlueskyFacet[] = [];
    
    // Hashtag regex - match #word patterns
    const hashtagRegex = /#[a-zA-Z][a-zA-Z0-9_]*/g;
    let match;
    
    while ((match = hashtagRegex.exec(text)) !== null) {
      const hashtag = match[0];
      const startIndex = match.index;
      
      // Calculate byte offsets
      const beforeText = text.substring(0, startIndex);
      const byteStart = new TextEncoder().encode(beforeText).length;
      const byteEnd = byteStart + new TextEncoder().encode(hashtag).length;
      
      facets.push({
        index: {
          byteStart,
          byteEnd
        },
        features: [{
          $type: "app.bsky.richtext.facet#tag",
          tag: hashtag.substring(1) // Remove the # prefix
        }]
      });
    }
    
    return facets;
  }
  
  /**
   * Get the DID from the current session
   */
  private async getSessionDid(accessToken: string): Promise<string> {
    const response = await fetch(`${BLUESKY_SERVICE_URL}/xrpc/com.atproto.server.getSession`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error("Failed to get session info");
    }
    
    const session = await response.json();
    return session.did;
  }
  
  /**
   * Post content to Bluesky
   */
  async post(content: SocialPost, tokens: SocialAccountTokens): Promise<PostResult> {
    try {
      // Get the user's DID
      const did = await this.getSessionDid(tokens.accessToken);
      
      // Truncate content if needed (300 grapheme limit)
      let text = content.content;
      
      // Simple character count for truncation (approximation for graphemes)
      if (text.length > BLUESKY_CHAR_LIMIT) {
        // Truncate to 297 characters and add ellipsis
        text = text.substring(0, BLUESKY_CHAR_LIMIT - 3) + "...";
      }
      
      // Build the post record
      const postRecord: Record<string, unknown> = {
        $type: "app.bsky.feed.post",
        text: text,
        createdAt: new Date().toISOString()
      };
      
      // Add language tags
      postRecord.langs = ["en"];
      
      // Parse and add facets for URLs and hashtags
      const urlFacets = this.parseUrlFacets(text);
      const hashtagFacets = this.parseHashtagFacets(text);
      const allFacets = [...urlFacets, ...hashtagFacets];
      
      if (allFacets.length > 0) {
        postRecord.facets = allFacets;
      }
      
      // Create the post
      const response = await fetch(`${BLUESKY_SERVICE_URL}/xrpc/com.atproto.repo.createRecord`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          repo: did,
          collection: "app.bsky.feed.post",
          record: postRecord
        })
      });
      
      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Failed to create Bluesky post: ${error}` };
      }
      
      const result = await response.json();
      
      // Extract the rkey from the URI for the post URL
      // URI format: at://did:plc:xxx/app.bsky.feed.post/rkey
      const uriParts = result.uri.split("/");
      const rkey = uriParts[uriParts.length - 1];
      const handle = did.replace("did:plc:", "");
      
      return {
        success: true,
        postId: result.uri,
        postUrl: `https://bsky.app/profile/${did}/post/${rkey}`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
