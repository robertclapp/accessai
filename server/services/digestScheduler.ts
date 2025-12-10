/**
 * Digest Scheduler Service
 * 
 * Handles automatic sending of email digests based on user preferences.
 * Runs as a background worker checking for due digests.
 * 
 * @module services/digestScheduler
 */

import { eq, and, lte, or, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { emailDigestPreferences, users } from "../../drizzle/schema";
import { sendDigestEmail } from "./emailDigest";
import { notifyOwner } from "../_core/notification";

// ============================================
// CONFIGURATION
// ============================================

export const DIGEST_SCHEDULER_CONFIG = {
  /** How often to check for due digests (in milliseconds) */
  CHECK_INTERVAL_MS: 15 * 60 * 1000, // 15 minutes
  
  /** Maximum number of digests to send in a single batch */
  BATCH_SIZE: 50,
  
  /** Maximum retry attempts for failed sends */
  MAX_RETRIES: 3,
  
  /** Delay between retries (in milliseconds) */
  RETRY_DELAY_MS: 30 * 60 * 1000, // 30 minutes
};

// ============================================
// TYPES
// ============================================

export interface DigestSchedulerStatus {
  isRunning: boolean;
  lastRun: Date | null;
  digestsSent: number;
  digestsFailed: number;
  nextRun: Date | null;
}

interface DueDigest {
  userId: number;
  email: string;
  userName: string;
  frequency: "weekly" | "monthly";
  lastSentAt: Date | null;
}

// ============================================
// STATE
// ============================================

let schedulerInterval: NodeJS.Timeout | null = null;
let isProcessing = false;
let schedulerStatus: DigestSchedulerStatus = {
  isRunning: false,
  lastRun: null,
  digestsSent: 0,
  digestsFailed: 0,
  nextRun: null,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate the next scheduled send time based on preferences
 */
export function calculateNextSendTime(
  frequency: "weekly" | "monthly",
  dayOfWeek: number | null,
  dayOfMonth: number | null,
  hour: number,
  lastSentAt: Date | null
): Date {
  const now = new Date();
  const nextSend = new Date();
  
  if (frequency === "weekly") {
    const targetDay = dayOfWeek ?? 1; // Default to Monday
    const currentDay = now.getDay();
    let daysUntilTarget = targetDay - currentDay;
    
    if (daysUntilTarget < 0) {
      daysUntilTarget += 7;
    } else if (daysUntilTarget === 0 && now.getHours() >= hour) {
      daysUntilTarget = 7;
    }
    
    nextSend.setDate(now.getDate() + daysUntilTarget);
    nextSend.setHours(hour, 0, 0, 0);
    
    // If we just sent one, move to next week
    if (lastSentAt) {
      const daysSinceLastSent = Math.floor((now.getTime() - lastSentAt.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLastSent < 1) {
        nextSend.setDate(nextSend.getDate() + 7);
      }
    }
  } else {
    // Monthly
    const targetDay = dayOfMonth ?? 1; // Default to 1st of month
    
    nextSend.setDate(targetDay);
    nextSend.setHours(hour, 0, 0, 0);
    
    // If we're past this month's target, move to next month
    if (now.getDate() > targetDay || (now.getDate() === targetDay && now.getHours() >= hour)) {
      nextSend.setMonth(nextSend.getMonth() + 1);
    }
    
    // Handle months with fewer days
    const lastDayOfMonth = new Date(nextSend.getFullYear(), nextSend.getMonth() + 1, 0).getDate();
    if (targetDay > lastDayOfMonth) {
      nextSend.setDate(lastDayOfMonth);
    }
    
    // If we just sent one, move to next month
    if (lastSentAt) {
      const daysSinceLastSent = Math.floor((now.getTime() - lastSentAt.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLastSent < 1) {
        nextSend.setMonth(nextSend.getMonth() + 1);
      }
    }
  }
  
  return nextSend;
}

/**
 * Check if a digest is due to be sent
 */
export function isDigestDue(
  frequency: "weekly" | "monthly",
  dayOfWeek: number | null,
  dayOfMonth: number | null,
  hour: number,
  lastSentAt: Date | null
): boolean {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay();
  const currentDate = now.getDate();
  
  // Check if we're in the right time window
  const isCorrectHour = currentHour === hour;
  
  if (frequency === "weekly") {
    const targetDay = dayOfWeek ?? 1;
    const isCorrectDay = currentDay === targetDay;
    
    if (!isCorrectDay || !isCorrectHour) return false;
    
    // Check if we already sent this week
    if (lastSentAt) {
      const daysSinceLastSent = Math.floor((now.getTime() - lastSentAt.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLastSent < 6) return false; // Less than a week ago
    }
    
    return true;
  } else {
    // Monthly
    const targetDay = dayOfMonth ?? 1;
    const isCorrectDate = currentDate === targetDay;
    
    if (!isCorrectDate || !isCorrectHour) return false;
    
    // Check if we already sent this month
    if (lastSentAt) {
      const lastSentMonth = lastSentAt.getMonth();
      const currentMonth = now.getMonth();
      if (lastSentMonth === currentMonth && lastSentAt.getFullYear() === now.getFullYear()) {
        return false;
      }
    }
    
    return true;
  }
}

// ============================================
// DATABASE FUNCTIONS
// ============================================

async function getDb() {
  if (!process.env.DATABASE_URL) return null;
  return drizzle(process.env.DATABASE_URL);
}

/**
 * Get all users with due digests
 */
async function getDueDigests(): Promise<DueDigest[]> {
  const db = await getDb();
  if (!db) return [];
  
  const now = new Date();
  const currentHour = now.getHours();
  
  // Get all enabled digest preferences
  const prefs = await db
    .select({
      userId: emailDigestPreferences.userId,
      frequency: emailDigestPreferences.frequency,
      dayOfWeek: emailDigestPreferences.dayOfWeek,
      dayOfMonth: emailDigestPreferences.dayOfMonth,
      hourUtc: emailDigestPreferences.hourUtc,
      lastSentAt: emailDigestPreferences.lastSentAt,
    })
    .from(emailDigestPreferences)
    .where(
      and(
        eq(emailDigestPreferences.enabled, true),
        eq(emailDigestPreferences.hourUtc, currentHour)
      )
    );
  
  // Filter to only those that are due
  const duePrefs = prefs.filter(pref => 
    isDigestDue(
      pref.frequency as "weekly" | "monthly",
      pref.dayOfWeek,
      pref.dayOfMonth,
      pref.hourUtc ?? 9,
      pref.lastSentAt
    )
  );
  
  if (duePrefs.length === 0) return [];
  
  // Get user info for due digests
  const userIds = duePrefs.map(p => p.userId);
  const usersData = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
    })
    .from(users)
    .where(
      or(...userIds.map(id => eq(users.id, id)))
    );
  
  const userMap = new Map(usersData.map(u => [u.id, u]));
  
  return duePrefs
    .filter(pref => {
      const user = userMap.get(pref.userId);
      return user && user.email;
    })
    .map(pref => {
      const user = userMap.get(pref.userId)!;
      return {
        userId: pref.userId,
        email: user.email!,
        userName: user.name || "User",
        frequency: pref.frequency as "weekly" | "monthly",
        lastSentAt: pref.lastSentAt,
      };
    });
}

/**
 * Update last sent timestamp for a user's digest
 */
async function updateLastSentAt(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db
    .update(emailDigestPreferences)
    .set({ lastSentAt: new Date() })
    .where(eq(emailDigestPreferences.userId, userId));
}

// ============================================
// CORE SCHEDULER FUNCTIONS
// ============================================

/**
 * Process a batch of due digests
 */
async function processDueDigests(): Promise<void> {
  if (isProcessing) {
    console.log("[DigestScheduler] Already processing, skipping...");
    return;
  }
  
  isProcessing = true;
  console.log("[DigestScheduler] Checking for due digests...");
  
  try {
    const dueDigests = await getDueDigests();
    
    if (dueDigests.length === 0) {
      console.log("[DigestScheduler] No digests due at this time");
      return;
    }
    
    console.log(`[DigestScheduler] Found ${dueDigests.length} due digests`);
    
    // Process in batches
    const batch = dueDigests.slice(0, DIGEST_SCHEDULER_CONFIG.BATCH_SIZE);
    
    for (const digest of batch) {
      try {
        console.log(`[DigestScheduler] Sending ${digest.frequency} digest to user ${digest.userId}`);
        
        const success = await sendDigestEmail(digest.userId, digest.frequency);
        
        if (success) {
          await updateLastSentAt(digest.userId);
          schedulerStatus.digestsSent++;
          console.log(`[DigestScheduler] Successfully sent digest to user ${digest.userId}`);
        } else {
          schedulerStatus.digestsFailed++;
          console.error(`[DigestScheduler] Failed to send digest to user ${digest.userId}`);
        }
      } catch (error) {
        schedulerStatus.digestsFailed++;
        console.error(`[DigestScheduler] Error sending digest to user ${digest.userId}:`, error);
      }
    }
    
    schedulerStatus.lastRun = new Date();
    schedulerStatus.nextRun = new Date(Date.now() + DIGEST_SCHEDULER_CONFIG.CHECK_INTERVAL_MS);
    
  } catch (error) {
    console.error("[DigestScheduler] Error processing digests:", error);
    
    // Notify owner of scheduler errors
    await notifyOwner({
      title: "Digest Scheduler Error",
      content: `Error processing email digests: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  } finally {
    isProcessing = false;
  }
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Start the digest scheduler
 */
export function startDigestScheduler(): void {
  if (schedulerInterval) {
    console.log("[DigestScheduler] Scheduler already running");
    return;
  }
  
  console.log("[DigestScheduler] Starting digest scheduler...");
  
  // Run immediately on start
  processDueDigests();
  
  // Then run on interval
  schedulerInterval = setInterval(
    processDueDigests,
    DIGEST_SCHEDULER_CONFIG.CHECK_INTERVAL_MS
  );
  
  schedulerStatus.isRunning = true;
  schedulerStatus.nextRun = new Date(Date.now() + DIGEST_SCHEDULER_CONFIG.CHECK_INTERVAL_MS);
  
  console.log("[DigestScheduler] Scheduler started");
}

/**
 * Stop the digest scheduler
 */
export function stopDigestScheduler(): void {
  if (!schedulerInterval) {
    console.log("[DigestScheduler] Scheduler not running");
    return;
  }
  
  clearInterval(schedulerInterval);
  schedulerInterval = null;
  schedulerStatus.isRunning = false;
  schedulerStatus.nextRun = null;
  
  console.log("[DigestScheduler] Scheduler stopped");
}

/**
 * Get the current scheduler status
 */
export function getDigestSchedulerStatus(): DigestSchedulerStatus {
  return { ...schedulerStatus };
}

/**
 * Manually trigger digest processing (for testing/admin)
 */
export async function triggerDigestProcessing(): Promise<void> {
  await processDueDigests();
}

/**
 * Reset scheduler statistics
 */
export function resetDigestSchedulerStats(): void {
  schedulerStatus.digestsSent = 0;
  schedulerStatus.digestsFailed = 0;
}
