/**
 * Scheduled Posting Service
 * 
 * Handles automatic publishing of scheduled posts using social media APIs.
 * Implements a background worker pattern with retry logic and rate limiting.
 * 
 * @module services/scheduledPosting
 */

import * as db from "../db";
import { getAdapter, type Platform } from "../social";
import { notifyOwner } from "../_core/notification";
import type { Post } from "../../drizzle/schema";

// ============================================
// CONFIGURATION
// ============================================

/**
 * Configuration for the scheduled posting service
 */
export const SCHEDULER_CONFIG = {
  /** How often to check for scheduled posts (in milliseconds) */
  CHECK_INTERVAL_MS: 60 * 1000, // 1 minute
  
  /** Maximum number of posts to process in a single batch */
  BATCH_SIZE: 10,
  
  /** Maximum retry attempts for failed posts */
  MAX_RETRIES: 3,
  
  /** Delay between retries (in milliseconds) */
  RETRY_DELAY_MS: 5 * 60 * 1000, // 5 minutes
  
  /** Rate limit: minimum delay between API calls per platform (in milliseconds) */
  RATE_LIMIT_MS: {
    linkedin: 1000,
    twitter: 500,
    facebook: 1000,
    instagram: 2000,
    threads: 1000,
    bluesky: 500
  } as Record<Platform, number>,
  
  /** Grace period for scheduled posts (posts within this window are considered due) */
  GRACE_PERIOD_MS: 5 * 60 * 1000, // 5 minutes
};

// ============================================
// TYPES
// ============================================

export interface PostingResult {
  postId: number;
  platform: string;
  success: boolean;
  postUrl?: string;
  error?: string;
  retryCount: number;
}

export interface SchedulerStatus {
  isRunning: boolean;
  lastRun: Date | null;
  postsProcessed: number;
  postsSucceeded: number;
  postsFailed: number;
  nextRun: Date | null;
}

// ============================================
// STATE
// ============================================

let schedulerInterval: NodeJS.Timeout | null = null;
let isProcessing = false;
let schedulerStatus: SchedulerStatus = {
  isRunning: false,
  lastRun: null,
  postsProcessed: 0,
  postsSucceeded: 0,
  postsFailed: 0,
  nextRun: null
};

// Track retry counts for posts
const retryCountMap = new Map<number, number>();

// Track last API call time per platform for rate limiting
const lastApiCallMap = new Map<Platform, number>();

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Waits for rate limit to clear for a platform
 */
async function waitForRateLimit(platform: Platform): Promise<void> {
  const lastCall = lastApiCallMap.get(platform) || 0;
  const minDelay = SCHEDULER_CONFIG.RATE_LIMIT_MS[platform] || 1000;
  const elapsed = Date.now() - lastCall;
  
  if (elapsed < minDelay) {
    await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
  }
  
  lastApiCallMap.set(platform, Date.now());
}

/**
 * Logs a message with timestamp
 */
function log(level: "info" | "warn" | "error", message: string, data?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const prefix = `[ScheduledPosting] [${level.toUpperCase()}] [${timestamp}]`;
  
  if (data) {
    console[level](`${prefix} ${message}`, data);
  } else {
    console[level](`${prefix} ${message}`);
  }
}

// ============================================
// CORE POSTING LOGIC
// ============================================

/**
 * Publishes a single post to its target platform
 */
async function publishPost(post: Post): Promise<PostingResult> {
  const platform = post.platform as Platform;
  const retryCount = retryCountMap.get(post.id) || 0;
  
  log("info", `Publishing post ${post.id} to ${platform}`, { retryCount });
  
  try {
    // Get user's social account for this platform
    const socialAccount = await db.getSocialAccountByPlatform(post.userId, platform);
    
    if (!socialAccount) {
      return {
        postId: post.id,
        platform,
        success: false,
        error: `No ${platform} account connected`,
        retryCount
      };
    }
    
    // Check if token is expired
    if (socialAccount.tokenExpiresAt && new Date(socialAccount.tokenExpiresAt) < new Date()) {
      // Try to refresh the token
      const adapter = getAdapter(platform);
      if (socialAccount.refreshToken && adapter.refreshToken) {
        try {
          const newTokens = await adapter.refreshToken(socialAccount.refreshToken);
          await db.updateSocialAccount(socialAccount.id, {
            accessToken: newTokens.accessToken,
            refreshToken: newTokens.refreshToken,
            tokenExpiresAt: newTokens.tokenExpiresAt
          });
          socialAccount.accessToken = newTokens.accessToken;
        } catch (refreshError) {
          return {
            postId: post.id,
            platform,
            success: false,
            error: "Token expired and refresh failed. Please reconnect your account.",
            retryCount
          };
        }
      } else {
        return {
          postId: post.id,
          platform,
          success: false,
          error: "Token expired. Please reconnect your account.",
          retryCount
        };
      }
    }
    
    // Wait for rate limit
    await waitForRateLimit(platform);
    
    // Publish the post
    const adapter = getAdapter(platform);
    const result = await adapter.post(
      {
        content: post.content,
        mediaUrls: post.mediaUrls || undefined,
        altTexts: post.altTexts || undefined,
        hashtags: post.hashtags || undefined
      },
      {
        accessToken: socialAccount.accessToken || "",
        refreshToken: socialAccount.refreshToken || undefined,
        tokenExpiresAt: socialAccount.tokenExpiresAt || undefined
      }
    );
    
    if (result.success) {
      // Update post status
      await db.updatePost(post.id, {
        status: "published",
        publishedAt: new Date()
      });
      
      // Clear retry count
      retryCountMap.delete(post.id);
      
      log("info", `Successfully published post ${post.id}`, { postUrl: result.postUrl });
      
      return {
        postId: post.id,
        platform,
        success: true,
        postUrl: result.postUrl,
        retryCount
      };
    } else {
      throw new Error(result.error || "Unknown error");
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("error", `Failed to publish post ${post.id}`, { error: errorMessage, retryCount });
    
    // Increment retry count
    const newRetryCount = retryCount + 1;
    retryCountMap.set(post.id, newRetryCount);
    
    // If max retries exceeded, mark as failed
    if (newRetryCount >= SCHEDULER_CONFIG.MAX_RETRIES) {
      await db.updatePost(post.id, { status: "failed" });
      retryCountMap.delete(post.id);
      
      // Notify owner of failure
      try {
        await notifyOwner({
          title: "Post Publishing Failed",
          content: `Post "${post.title || post.id}" failed to publish to ${platform} after ${SCHEDULER_CONFIG.MAX_RETRIES} attempts. Error: ${errorMessage}`
        });
      } catch {
        log("warn", "Failed to send failure notification");
      }
    }
    
    return {
      postId: post.id,
      platform,
      success: false,
      error: errorMessage,
      retryCount: newRetryCount
    };
  }
}

/**
 * Gets all posts that are due for publishing
 */
async function getDuePosts(): Promise<Post[]> {
  const now = new Date();
  const gracePeriod = new Date(now.getTime() + SCHEDULER_CONFIG.GRACE_PERIOD_MS);
  
  // Get scheduled posts that are due
  const scheduledPosts = await db.getScheduledPostsDue(gracePeriod);
  
  // Filter out posts that are being retried (they'll be picked up by retry logic)
  const duePosts = scheduledPosts.filter(post => {
    const retryCount = retryCountMap.get(post.id) || 0;
    if (retryCount > 0) {
      // Check if enough time has passed for retry
      const lastAttempt = lastApiCallMap.get(post.platform as Platform) || 0;
      const retryDelay = SCHEDULER_CONFIG.RETRY_DELAY_MS * retryCount;
      return Date.now() - lastAttempt >= retryDelay;
    }
    return true;
  });
  
  return duePosts.slice(0, SCHEDULER_CONFIG.BATCH_SIZE);
}

/**
 * Processes a batch of scheduled posts
 */
async function processBatch(): Promise<void> {
  if (isProcessing) {
    log("info", "Already processing, skipping batch");
    return;
  }
  
  isProcessing = true;
  schedulerStatus.lastRun = new Date();
  
  try {
    const duePosts = await getDuePosts();
    
    if (duePosts.length === 0) {
      log("info", "No posts due for publishing");
      return;
    }
    
    log("info", `Processing ${duePosts.length} scheduled posts`);
    
    const results: PostingResult[] = [];
    
    for (const post of duePosts) {
      const result = await publishPost(post);
      results.push(result);
      
      schedulerStatus.postsProcessed++;
      if (result.success) {
        schedulerStatus.postsSucceeded++;
      } else {
        schedulerStatus.postsFailed++;
      }
    }
    
    // Log summary
    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    log("info", `Batch complete: ${succeeded} succeeded, ${failed} failed`);
    
  } catch (error) {
    log("error", "Error processing batch", { error: String(error) });
  } finally {
    isProcessing = false;
    schedulerStatus.nextRun = new Date(Date.now() + SCHEDULER_CONFIG.CHECK_INTERVAL_MS);
  }
}

// ============================================
// SCHEDULER CONTROL
// ============================================

/**
 * Starts the scheduled posting background worker
 */
export function startScheduler(): void {
  if (schedulerInterval) {
    log("warn", "Scheduler already running");
    return;
  }
  
  log("info", "Starting scheduled posting service");
  
  schedulerStatus.isRunning = true;
  schedulerStatus.nextRun = new Date(Date.now() + SCHEDULER_CONFIG.CHECK_INTERVAL_MS);
  
  // Run immediately on start
  processBatch();
  
  // Set up interval
  schedulerInterval = setInterval(processBatch, SCHEDULER_CONFIG.CHECK_INTERVAL_MS);
}

/**
 * Stops the scheduled posting background worker
 */
export function stopScheduler(): void {
  if (!schedulerInterval) {
    log("warn", "Scheduler not running");
    return;
  }
  
  log("info", "Stopping scheduled posting service");
  
  clearInterval(schedulerInterval);
  schedulerInterval = null;
  schedulerStatus.isRunning = false;
  schedulerStatus.nextRun = null;
}

/**
 * Gets the current scheduler status
 */
export function getSchedulerStatus(): SchedulerStatus {
  return { ...schedulerStatus };
}

/**
 * Manually triggers a batch processing run
 */
export async function triggerBatch(): Promise<void> {
  log("info", "Manually triggering batch processing");
  await processBatch();
}

/**
 * Resets scheduler statistics
 */
export function resetStats(): void {
  schedulerStatus.postsProcessed = 0;
  schedulerStatus.postsSucceeded = 0;
  schedulerStatus.postsFailed = 0;
  retryCountMap.clear();
}
