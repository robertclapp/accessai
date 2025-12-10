/**
 * Social Media API Integration Framework
 * 
 * This module provides a unified interface for posting to multiple social media platforms.
 * Each platform has its own adapter that handles authentication and API calls.
 * 
 * IMPORTANT: To use these integrations, you need to:
 * 1. Apply for developer access on each platform
 * 2. Create an application and get API credentials
 * 3. Configure the credentials in your environment variables
 */

import { LinkedInAdapter } from "./linkedin";
import { TwitterAdapter } from "./twitter";
import { FacebookAdapter } from "./facebook";
import { InstagramAdapter } from "./instagram";
import { ThreadsAdapter } from "./threads";
import { BlueskyAdapter } from "./bluesky";

export type Platform = "linkedin" | "twitter" | "facebook" | "instagram" | "threads" | "bluesky";

export interface SocialPost {
  content: string;
  mediaUrls?: string[];
  altTexts?: Record<string, string>;
  hashtags?: string[];
  scheduledAt?: Date;
}

export interface PostResult {
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
}

export interface SocialAccountTokens {
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
}

export interface SocialAdapter {
  platform: Platform;
  
  /**
   * Post content to the social media platform
   */
  post(content: SocialPost, tokens: SocialAccountTokens): Promise<PostResult>;
  
  /**
   * Refresh the access token if expired
   */
  refreshToken?(refreshToken: string): Promise<SocialAccountTokens>;
  
  /**
   * Get the OAuth authorization URL
   */
  getAuthUrl(redirectUri: string, state: string): string;
  
  /**
   * Exchange authorization code for tokens
   */
  exchangeCodeForTokens(code: string, redirectUri: string): Promise<SocialAccountTokens & { accountId: string; accountName: string }>;
  
  /**
   * Validate that the tokens are still valid
   */
  validateTokens(tokens: SocialAccountTokens): Promise<boolean>;
}

/**
 * Get the appropriate adapter for a platform
 */
export function getAdapter(platform: Platform): SocialAdapter {
  switch (platform) {
    case "linkedin":
      return new LinkedInAdapter();
    case "twitter":
      return new TwitterAdapter();
    case "facebook":
      return new FacebookAdapter();
    case "instagram":
      return new InstagramAdapter();
    case "threads":
      return new ThreadsAdapter();
    case "bluesky":
      return new BlueskyAdapter();
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

/**
 * Post to multiple platforms simultaneously
 */
export async function postToMultiplePlatforms(
  post: SocialPost,
  accounts: Array<{ platform: Platform; tokens: SocialAccountTokens }>
): Promise<Record<Platform, PostResult>> {
  const results: Record<string, PostResult> = {};
  
  await Promise.all(
    accounts.map(async ({ platform, tokens }) => {
      try {
        const adapter = getAdapter(platform);
        results[platform] = await adapter.post(post, tokens);
      } catch (error) {
        results[platform] = {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    })
  );
  
  return results as Record<Platform, PostResult>;
}

/**
 * Format content for a specific platform
 * Handles character limits, hashtag formatting, etc.
 */
export function formatContentForPlatform(content: string, platform: Platform): string {
  const limits: Record<Platform, number> = {
    linkedin: 3000,
    twitter: 280,
    facebook: 63206,
    instagram: 2200,
    threads: 500,
    bluesky: 300
  };
  
  const limit = limits[platform];
  
  if (content.length <= limit) {
    return content;
  }
  
  // Truncate with ellipsis
  return content.substring(0, limit - 3) + "...";
}

/**
 * Format hashtags for accessibility (CamelCase)
 */
export function formatHashtagsAccessible(hashtags: string[]): string[] {
  return hashtags.map(tag => {
    // Remove # if present
    const cleanTag = tag.startsWith("#") ? tag.slice(1) : tag;
    
    // Split by common separators and capitalize each word
    const words = cleanTag.split(/[-_\s]+/);
    const camelCase = words.map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join("");
    
    return `#${camelCase}`;
  });
}
