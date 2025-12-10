/**
 * Email Digest Service
 * 
 * Handles automated weekly/monthly email digest reports including:
 * - Analytics summary
 * - Goal progress tracking
 * - Top performing posts
 * - Platform comparison highlights
 * 
 * @module services/emailDigest
 */

import { eq, and, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { emailDigestPreferences, users } from "../../drizzle/schema";
import { notifyOwner } from "../_core/notification";
import * as db from "../db";
import { PLATFORM_DISPLAY_NAMES } from "../../shared/constants";

// ============================================
// TYPES
// ============================================

export interface DigestContent {
  userId: number;
  userName: string;
  email: string;
  period: "weekly" | "monthly";
  periodStart: Date;
  periodEnd: Date;
  analytics?: AnalyticsSummary;
  goalProgress?: GoalProgressSummary[];
  topPosts?: TopPostSummary[];
  platformComparison?: PlatformComparisonSummary[];
  scheduledPosts?: ScheduledPostSummary[];
}

interface AnalyticsSummary {
  totalPosts: number;
  totalImpressions: number;
  totalEngagements: number;
  avgEngagementRate: number;
  changeFromPrevious: {
    posts: number;
    impressions: number;
    engagements: number;
  };
}

interface GoalProgressSummary {
  platform: string;
  targetEngagementRate: number;
  currentEngagementRate: number;
  progressPercent: number;
  status: "achieved" | "on_track" | "behind";
}

interface TopPostSummary {
  id: number;
  title: string;
  platform: string;
  engagements: number;
  impressions: number;
  engagementRate: number;
  publishedAt: Date;
}

interface PlatformComparisonSummary {
  platform: string;
  postCount: number;
  totalEngagements: number;
  avgEngagementRate: number;
  bestPerformer: boolean;
}

interface ScheduledPostSummary {
  id: number;
  title: string;
  platform: string;
  scheduledAt: Date;
}

// ============================================
// DATABASE HELPERS
// ============================================

let _db: ReturnType<typeof drizzle> | null = null;

async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    _db = drizzle(process.env.DATABASE_URL);
  }
  return _db;
}

// ============================================
// DIGEST PREFERENCE MANAGEMENT
// ============================================

/**
 * Get or create digest preferences for a user
 */
export async function getDigestPreferences(userId: number) {
  const database = await getDb();
  if (!database) return null;

  const [existing] = await database
    .select()
    .from(emailDigestPreferences)
    .where(eq(emailDigestPreferences.userId, userId))
    .limit(1);

  if (existing) return existing;

  // Create default preferences
  await database.insert(emailDigestPreferences).values({
    userId,
    enabled: true,
    frequency: "weekly",
    dayOfWeek: 1, // Monday
    hourUtc: 9,
  });

  const [created] = await database
    .select()
    .from(emailDigestPreferences)
    .where(eq(emailDigestPreferences.userId, userId))
    .limit(1);

  return created;
}

/**
 * Update digest preferences for a user
 */
export async function updateDigestPreferences(
  userId: number,
  updates: Partial<{
    enabled: boolean;
    frequency: "weekly" | "monthly";
    dayOfWeek: number;
    dayOfMonth: number;
    hourUtc: number;
    includeAnalytics: boolean;
    includeGoalProgress: boolean;
    includeTopPosts: boolean;
    includePlatformComparison: boolean;
    includeScheduledPosts: boolean;
  }>
) {
  const database = await getDb();
  if (!database) return false;

  await database
    .update(emailDigestPreferences)
    .set(updates)
    .where(eq(emailDigestPreferences.userId, userId));

  return true;
}

// ============================================
// DIGEST CONTENT GENERATION
// ============================================

/**
 * Generate digest content for a user
 */
export async function generateDigestContent(
  userId: number,
  period: "weekly" | "monthly"
): Promise<DigestContent | null> {
  const user = await db.getUserById(userId);
  if (!user || !user.email) return null;

  const prefs = await getDigestPreferences(userId);
  if (!prefs) return null;

  // Calculate period dates
  const now = new Date();
  const periodEnd = now;
  const periodStart = new Date(now);
  
  if (period === "weekly") {
    periodStart.setDate(periodStart.getDate() - 7);
  } else {
    periodStart.setMonth(periodStart.getMonth() - 1);
  }

  const content: DigestContent = {
    userId,
    userName: user.name || "User",
    email: user.email,
    period,
    periodStart,
    periodEnd,
  };

  // Gather analytics if enabled
  if (prefs.includeAnalytics) {
    content.analytics = await generateAnalyticsSummary(userId, periodStart, periodEnd);
  }

  // Gather goal progress if enabled
  if (prefs.includeGoalProgress) {
    content.goalProgress = await generateGoalProgress(userId);
  }

  // Gather top posts if enabled
  if (prefs.includeTopPosts) {
    content.topPosts = await generateTopPosts(userId, periodStart, periodEnd);
  }

  // Gather platform comparison if enabled
  if (prefs.includePlatformComparison) {
    content.platformComparison = await generatePlatformComparison(userId, periodStart, periodEnd);
  }

  // Gather scheduled posts if enabled
  if (prefs.includeScheduledPosts) {
    content.scheduledPosts = await generateScheduledPosts(userId);
  }

  return content;
}

/**
 * Generate analytics summary for the period
 */
async function generateAnalyticsSummary(
  userId: number,
  periodStart: Date,
  periodEnd: Date
): Promise<AnalyticsSummary> {
  const summary = await db.getUserAnalyticsSummary(userId);
  
  // Calculate previous period for comparison
  const prevPeriodEnd = periodStart;
  const prevPeriodStart = new Date(periodStart);
  const periodDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
  prevPeriodStart.setDate(prevPeriodStart.getDate() - periodDays);

  const prevSummary = await db.getUserAnalyticsSummary(userId);

  return {
    totalPosts: summary?.totalPosts || 0,
    totalImpressions: summary?.totalImpressions || 0,
    totalEngagements: summary?.totalEngagements || 0,
    avgEngagementRate: parseFloat(summary?.engagementRate || "0"),
    changeFromPrevious: {
      posts: (summary?.totalPosts || 0) - (prevSummary?.totalPosts || 0),
      impressions: (summary?.totalImpressions || 0) - (prevSummary?.totalImpressions || 0),
      engagements: (summary?.totalEngagements || 0) - (prevSummary?.totalEngagements || 0),
    },
  };
}

/**
 * Generate goal progress summary
 */
async function generateGoalProgress(userId: number): Promise<GoalProgressSummary[]> {
  const goals = await db.getUserPlatformGoals(userId);
  const progress: GoalProgressSummary[] = [];

  for (const goal of goals) {
    const platformAnalytics = await db.getPlatformAnalyticsComparison(userId);
    const platformData = platformAnalytics.find(p => p.platform === goal.platform);
    
    const currentRate = platformData?.engagementRate || 0;
    const targetRate = goal.targetEngagementRate / 100; // Convert from basis points
    const progressPercent = targetRate > 0 ? (currentRate / targetRate) * 100 : 0;

    let status: "achieved" | "on_track" | "behind" = "behind";
    if (progressPercent >= 100) status = "achieved";
    else if (progressPercent >= 70) status = "on_track";

    progress.push({
      platform: goal.platform,
      targetEngagementRate: targetRate,
      currentEngagementRate: currentRate,
      progressPercent: Math.min(progressPercent, 100),
      status,
    });
  }

  return progress;
}

/**
 * Generate top performing posts
 */
async function generateTopPosts(
  userId: number,
  periodStart: Date,
  periodEnd: Date
): Promise<TopPostSummary[]> {
  const posts = await db.getUserPosts(userId, { status: "published", limit: 5 });
  
  return posts
    .filter(p => p.publishedAt && p.publishedAt >= periodStart && p.publishedAt <= periodEnd)
    .map(p => {
      const analytics = p.analytics || {};
      const engagements = (analytics.likes || 0) + (analytics.comments || 0) + (analytics.shares || 0);
      const impressions = analytics.impressions || 0;
      return {
        id: p.id,
        title: p.title || "Untitled Post",
        platform: p.platform,
        engagements,
        impressions,
        engagementRate: impressions ? (engagements / impressions) * 100 : 0,
        publishedAt: p.publishedAt!,
      };
    })
    .sort((a, b) => b.engagements - a.engagements)
    .slice(0, 5);
}

/**
 * Generate platform comparison summary
 */
async function generatePlatformComparison(
  userId: number,
  periodStart: Date,
  periodEnd: Date
): Promise<PlatformComparisonSummary[]> {
  const comparison = await db.getPlatformAnalyticsComparison(userId);
  const bestPlatform = await db.getBestPerformingPlatform(userId);

  return comparison.map(p => ({
    platform: p.platform,
    postCount: p.postCount,
    totalEngagements: p.totalEngagements,
    avgEngagementRate: p.engagementRate,
    bestPerformer: p.platform === bestPlatform?.platform,
  }));
}

/**
 * Generate upcoming scheduled posts
 */
async function generateScheduledPosts(userId: number): Promise<ScheduledPostSummary[]> {
  const posts = await db.getUserPosts(userId, { status: "scheduled", limit: 10 });
  
  return posts
    .filter(p => p.scheduledAt && p.scheduledAt > new Date())
    .map(p => ({
      id: p.id,
      title: p.title || "Untitled Post",
      platform: p.platform,
      scheduledAt: p.scheduledAt!,
    }))
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
    .slice(0, 5);
}

// ============================================
// EMAIL FORMATTING
// ============================================

/**
 * Format digest content as email body
 */
export function formatDigestEmail(content: DigestContent): string {
  const periodLabel = content.period === "weekly" ? "Weekly" : "Monthly";
  const dateRange = `${content.periodStart.toLocaleDateString()} - ${content.periodEnd.toLocaleDateString()}`;

  let email = `
${periodLabel} Analytics Digest for ${content.userName}
${dateRange}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  // Analytics Summary
  if (content.analytics) {
    const a = content.analytics;
    email += `
📊 ANALYTICS SUMMARY
───────────────────────────────────────────────────────────────

Total Posts: ${a.totalPosts} (${a.changeFromPrevious.posts >= 0 ? "+" : ""}${a.changeFromPrevious.posts} from previous period)
Total Impressions: ${a.totalImpressions.toLocaleString()} (${a.changeFromPrevious.impressions >= 0 ? "+" : ""}${a.changeFromPrevious.impressions.toLocaleString()})
Total Engagements: ${a.totalEngagements.toLocaleString()} (${a.changeFromPrevious.engagements >= 0 ? "+" : ""}${a.changeFromPrevious.engagements.toLocaleString()})
Avg Engagement Rate: ${a.avgEngagementRate.toFixed(2)}%

`;
  }

  // Goal Progress
  if (content.goalProgress && content.goalProgress.length > 0) {
    email += `
🎯 GOAL PROGRESS
───────────────────────────────────────────────────────────────

`;
    for (const goal of content.goalProgress) {
      const statusEmoji = goal.status === "achieved" ? "✅" : goal.status === "on_track" ? "🔄" : "⚠️";
      const platformName = PLATFORM_DISPLAY_NAMES[goal.platform as keyof typeof PLATFORM_DISPLAY_NAMES] || goal.platform;
      email += `${statusEmoji} ${platformName}: ${goal.currentEngagementRate.toFixed(2)}% / ${goal.targetEngagementRate.toFixed(2)}% target (${goal.progressPercent.toFixed(0)}%)
`;
    }
    email += "\n";
  }

  // Top Posts
  if (content.topPosts && content.topPosts.length > 0) {
    email += `
🏆 TOP PERFORMING POSTS
───────────────────────────────────────────────────────────────

`;
    for (let i = 0; i < content.topPosts.length; i++) {
      const post = content.topPosts[i];
      const platformName = PLATFORM_DISPLAY_NAMES[post.platform as keyof typeof PLATFORM_DISPLAY_NAMES] || post.platform;
      email += `${i + 1}. "${post.title}" (${platformName})
   ${post.engagements} engagements | ${post.impressions.toLocaleString()} impressions | ${post.engagementRate.toFixed(2)}% rate

`;
    }
  }

  // Platform Comparison
  if (content.platformComparison && content.platformComparison.length > 0) {
    email += `
📈 PLATFORM COMPARISON
───────────────────────────────────────────────────────────────

`;
    for (const platform of content.platformComparison) {
      const platformName = PLATFORM_DISPLAY_NAMES[platform.platform as keyof typeof PLATFORM_DISPLAY_NAMES] || platform.platform;
      const badge = platform.bestPerformer ? " ⭐ Best Performer" : "";
      email += `${platformName}${badge}
   ${platform.postCount} posts | ${platform.totalEngagements} engagements | ${platform.avgEngagementRate.toFixed(2)}% avg rate

`;
    }
  }

  // Scheduled Posts
  if (content.scheduledPosts && content.scheduledPosts.length > 0) {
    email += `
📅 UPCOMING SCHEDULED POSTS
───────────────────────────────────────────────────────────────

`;
    for (const post of content.scheduledPosts) {
      const platformName = PLATFORM_DISPLAY_NAMES[post.platform as keyof typeof PLATFORM_DISPLAY_NAMES] || post.platform;
      email += `• "${post.title}" (${platformName}) - ${post.scheduledAt.toLocaleString()}
`;
    }
    email += "\n";
  }

  email += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This digest was sent because you have email digests enabled.
Manage your preferences in AccessAI Settings > Notifications.

AccessAI - Create Inclusive Content That Reaches Everyone
`;

  return email;
}

// ============================================
// DIGEST SENDING
// ============================================

/**
 * Send a digest email to a user
 */
export async function sendDigestEmail(userId: number, period: "weekly" | "monthly"): Promise<boolean> {
  try {
    const content = await generateDigestContent(userId, period);
    if (!content) {
      console.warn(`[EmailDigest] Could not generate content for user ${userId}`);
      return false;
    }

    const emailBody = formatDigestEmail(content);

    // Send via notification system (in production, use email service)
    await notifyOwner({
      title: `${period === "weekly" ? "Weekly" : "Monthly"} Digest for ${content.email}`,
      content: emailBody,
    });

    // Update last sent timestamp
    const database = await getDb();
    if (database) {
      await database
        .update(emailDigestPreferences)
        .set({ lastSentAt: new Date() })
        .where(eq(emailDigestPreferences.userId, userId));
    }

    console.log(`[EmailDigest] Sent ${period} digest to user ${userId}`);
    return true;
  } catch (error) {
    console.error(`[EmailDigest] Failed to send digest to user ${userId}:`, error);
    return false;
  }
}

/**
 * Check and send digests for all eligible users
 * This should be called by a scheduled job
 */
export async function processScheduledDigests(): Promise<{ sent: number; failed: number }> {
  const database = await getDb();
  if (!database) return { sent: 0, failed: 0 };

  const now = new Date();
  const currentHour = now.getUTCHours();
  const currentDayOfWeek = now.getUTCDay();
  const currentDayOfMonth = now.getUTCDate();

  let sent = 0;
  let failed = 0;

  try {
    // Get all enabled digest preferences
    const allPrefs = await database
      .select()
      .from(emailDigestPreferences)
      .where(eq(emailDigestPreferences.enabled, true));

    for (const pref of allPrefs) {
      // Check if it's time to send
      if (pref.hourUtc !== currentHour) continue;

      // Check if already sent today
      if (pref.lastSentAt) {
        const lastSentDate = new Date(pref.lastSentAt);
        if (lastSentDate.toDateString() === now.toDateString()) continue;
      }

      let shouldSend = false;
      let period: "weekly" | "monthly" = "weekly";

      if (pref.frequency === "weekly" && pref.dayOfWeek === currentDayOfWeek) {
        shouldSend = true;
        period = "weekly";
      } else if (pref.frequency === "monthly" && pref.dayOfMonth === currentDayOfMonth) {
        shouldSend = true;
        period = "monthly";
      }

      if (shouldSend) {
        const success = await sendDigestEmail(pref.userId, period);
        if (success) sent++;
        else failed++;
      }
    }
  } catch (error) {
    console.error("[EmailDigest] Error processing scheduled digests:", error);
  }

  return { sent, failed };
}
