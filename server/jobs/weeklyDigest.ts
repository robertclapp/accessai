/**
 * Weekly Digest Email Job
 * 
 * This job runs on a schedule to send weekly digest emails to users
 * who have enabled digest notifications.
 */

import { getDb } from "../db";
import { users, digestEmailPreferences, weeklyDigestLogs } from "../../drizzle/schema";
import { eq, and, lte } from "drizzle-orm";
import { generateDigestContent, logDigestSent } from "../db";
import { notifyOwner } from "../_core/notification";

interface DigestUser {
  id: number;
  name: string | null;
  email: string | null;
  preferences: {
    enabled: boolean;
    frequency: string;
    preferredDay: number;
    preferredHour: number;
    includeFollowedCollections: boolean;
    includeTrending: boolean;
    includeRecommendations: boolean;
    maxTemplatesPerSection: number;
  };
}

/**
 * Get users who should receive a digest email today
 */
export async function getUsersForDigest(): Promise<DigestUser[]> {
  const db = await getDb();
  if (!db) return [];
  
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentHour = now.getHours();
  
  // Get users with digest enabled and matching schedule
  const usersWithPrefs = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      enabled: digestEmailPreferences.enabled,
      frequency: digestEmailPreferences.frequency,
      preferredDay: digestEmailPreferences.preferredDay,
      preferredHour: digestEmailPreferences.preferredHour,
      includeFollowedCollections: digestEmailPreferences.includeFollowedCollections,
      includeTrending: digestEmailPreferences.includeTrending,
      includeRecommendations: digestEmailPreferences.includeRecommendations,
      maxTemplatesPerSection: digestEmailPreferences.maxTemplatesPerSection,
    })
    .from(users)
    .innerJoin(digestEmailPreferences, eq(users.id, digestEmailPreferences.userId))
    .where(
      and(
        eq(digestEmailPreferences.enabled, true),
        eq(digestEmailPreferences.preferredDay, currentDay),
        lte(digestEmailPreferences.preferredHour, currentHour)
      )
    );
  
  return usersWithPrefs.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    preferences: {
      enabled: u.enabled ?? true,
      frequency: u.frequency ?? 'weekly',
      preferredDay: u.preferredDay ?? 1,
      preferredHour: u.preferredHour ?? 9,
      includeFollowedCollections: u.includeFollowedCollections ?? true,
      includeTrending: u.includeTrending ?? true,
      includeRecommendations: u.includeRecommendations ?? true,
      maxTemplatesPerSection: u.maxTemplatesPerSection ?? 5,
    },
  }));
}

/**
 * Check if a user has already received a digest this period
 */
async function hasReceivedDigestThisPeriod(userId: number, frequency: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return true; // Assume already sent to prevent duplicate sends
  
  const now = new Date();
  let periodStart: Date;
  
  switch (frequency) {
    case 'daily':
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'weekly':
      const dayOfWeek = now.getDay();
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() - dayOfWeek);
      periodStart.setHours(0, 0, 0, 0);
      break;
    case 'monthly':
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default:
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() - 7);
  }
  
  const recentLogs = await db
    .select()
    .from(weeklyDigestLogs)
    .where(
      and(
        eq(weeklyDigestLogs.userId, userId),
        eq(weeklyDigestLogs.sent, true)
      )
    )
    .limit(1);
  
  if (recentLogs.length === 0) return false;
  
  const lastSentAt = recentLogs[0].sentAt;
  if (!lastSentAt) return false;
  
  return new Date(lastSentAt) >= periodStart;
}

/**
 * Format digest content as HTML email
 */
function formatDigestEmail(content: any, userName: string | null): string {
  const name = userName || 'there';
  
  let html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px;">
        Hey ${name}! 👋
      </h1>
      <p style="color: #666; font-size: 16px; line-height: 1.6;">
        Here's your weekly template digest from AccessAI.
      </p>
  `;
  
  // Followed Collections Templates
  if (content.followedCollectionTemplates && content.followedCollectionTemplates.length > 0) {
    html += `
      <h2 style="color: #1a1a1a; font-size: 18px; margin-top: 30px; border-bottom: 2px solid #e5e5e5; padding-bottom: 10px;">
        📁 New from Collections You Follow
      </h2>
      <ul style="list-style: none; padding: 0;">
    `;
    for (const template of content.followedCollectionTemplates) {
      html += `
        <li style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
          <strong style="color: #1a1a1a;">${template.name}</strong>
          <span style="color: #888; font-size: 14px;"> in ${template.collectionName}</span>
          ${template.description ? `<p style="color: #666; font-size: 14px; margin: 5px 0 0;">${template.description}</p>` : ''}
        </li>
      `;
    }
    html += '</ul>';
  }
  
  // Trending Templates
  if (content.trendingTemplates && content.trendingTemplates.length > 0) {
    html += `
      <h2 style="color: #1a1a1a; font-size: 18px; margin-top: 30px; border-bottom: 2px solid #e5e5e5; padding-bottom: 10px;">
        🔥 Trending Templates
      </h2>
      <ul style="list-style: none; padding: 0;">
    `;
    for (const template of content.trendingTemplates) {
      html += `
        <li style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
          <strong style="color: #1a1a1a;">${template.name}</strong>
          <span style="color: #888; font-size: 14px;"> • ${template.category}</span>
          ${template.description ? `<p style="color: #666; font-size: 14px; margin: 5px 0 0;">${template.description}</p>` : ''}
        </li>
      `;
    }
    html += '</ul>';
  }
  
  // Recommended Templates
  if (content.recommendedTemplates && content.recommendedTemplates.length > 0) {
    html += `
      <h2 style="color: #1a1a1a; font-size: 18px; margin-top: 30px; border-bottom: 2px solid #e5e5e5; padding-bottom: 10px;">
        ✨ Recommended for You
      </h2>
      <ul style="list-style: none; padding: 0;">
    `;
    for (const template of content.recommendedTemplates) {
      html += `
        <li style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
          <strong style="color: #1a1a1a;">${template.name}</strong>
          <span style="color: #888; font-size: 14px;"> • ${template.category}</span>
          ${template.description ? `<p style="color: #666; font-size: 14px; margin: 5px 0 0;">${template.description}</p>` : ''}
        </li>
      `;
    }
    html += '</ul>';
  }
  
  // Footer
  html += `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center;">
        <p style="color: #888; font-size: 14px;">
          You're receiving this because you enabled weekly digest emails.
          <br>
          <a href="#" style="color: #3b82f6;">Manage your preferences</a>
        </p>
      </div>
    </div>
  `;
  
  return html;
}

/**
 * Send digest email to a single user
 */
async function sendDigestToUser(user: DigestUser): Promise<boolean> {
  try {
    // Check if already sent this period
    if (await hasReceivedDigestThisPeriod(user.id, user.preferences.frequency)) {
      console.log(`[WeeklyDigest] User ${user.id} already received digest this period`);
      return true;
    }
    
    // Generate digest content
    const digestData = await generateDigestContent(user.id);
    
    // Check if there's any content to send
    const totalTemplates = 
      (digestData.content.followedCollectionTemplates?.length || 0) +
      (digestData.content.trendingTemplates?.length || 0) +
      (digestData.content.recommendedTemplates?.length || 0);
    
    if (totalTemplates === 0) {
      console.log(`[WeeklyDigest] No content for user ${user.id}, skipping`);
      return true;
    }
    
    // Format email content
    const emailHtml = formatDigestEmail(digestData.content, user.name);
    
    // Send notification (using the owner notification system for now)
    // In production, this would use a proper email service
    const sent = await notifyOwner({
      title: `Weekly Template Digest for ${user.name || user.email || 'User'}`,
      content: `Digest contains ${totalTemplates} templates:\n` +
        `- ${digestData.content.followedCollectionTemplates?.length || 0} from followed collections\n` +
        `- ${digestData.content.trendingTemplates?.length || 0} trending\n` +
        `- ${digestData.content.recommendedTemplates?.length || 0} recommended`,
    });
    
    // Log the digest send
    await logDigestSent(
      user.id,
      digestData.periodStart,
      digestData.periodEnd,
      {
        followedCollectionTemplates: digestData.content.followedCollectionTemplates?.length || 0,
        trendingTemplates: digestData.content.trendingTemplates?.length || 0,
        recommendedTemplates: digestData.content.recommendedTemplates?.length || 0,
      },
      sent,
      sent ? undefined : 'Notification service unavailable'
    );
    
    console.log(`[WeeklyDigest] Sent digest to user ${user.id}: ${sent ? 'success' : 'failed'}`);
    return sent;
  } catch (error) {
    console.error(`[WeeklyDigest] Error sending digest to user ${user.id}:`, error);
    
    // Log the failure
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(now.getDate() - 7);
    
    await logDigestSent(
      user.id,
      periodStart,
      now,
      {
        followedCollectionTemplates: 0,
        trendingTemplates: 0,
        recommendedTemplates: 0,
      },
      false,
      error instanceof Error ? error.message : 'Unknown error'
    );
    
    return false;
  }
}

/**
 * Main job function - process all pending digest emails
 */
export async function processWeeklyDigests(): Promise<{
  processed: number;
  successful: number;
  failed: number;
}> {
  console.log('[WeeklyDigest] Starting weekly digest job...');
  
  const users = await getUsersForDigest();
  console.log(`[WeeklyDigest] Found ${users.length} users eligible for digest`);
  
  let successful = 0;
  let failed = 0;
  
  for (const user of users) {
    const result = await sendDigestToUser(user);
    if (result) {
      successful++;
    } else {
      failed++;
    }
  }
  
  console.log(`[WeeklyDigest] Job complete: ${successful} successful, ${failed} failed`);
  
  return {
    processed: users.length,
    successful,
    failed,
  };
}

/**
 * Manual trigger for testing
 */
export async function triggerDigestForUser(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const userResult = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  if (userResult.length === 0) return false;
  
  const user: DigestUser = {
    id: userResult[0].id,
    name: userResult[0].name,
    email: userResult[0].email,
    preferences: {
      enabled: true,
      frequency: 'weekly',
      preferredDay: new Date().getDay(),
      preferredHour: new Date().getHours(),
      includeFollowedCollections: true,
      includeTrending: true,
      includeRecommendations: true,
      maxTemplatesPerSection: 5,
    },
  };
  
  return await sendDigestToUser(user);
}
