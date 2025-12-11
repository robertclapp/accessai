/**
 * Cron Job Scheduler for Automated Tasks
 * 
 * Manages scheduled tasks including:
 * - Weekly digest emails
 * - Digest A/B test auto-completion checks
 * - Recommendation generation
 */

import { getDb } from "../db";
import { digestEmailPreferences, users } from "../../drizzle/schema";
import { eq, and, lte, or } from "drizzle-orm";
import { processWeeklyDigests } from "./weeklyDigest";

// Store scheduled jobs
interface ScheduledJob {
  id: string;
  name: string;
  cronExpression: string;
  lastRun: Date | null;
  nextRun: Date;
  enabled: boolean;
  handler: () => Promise<void>;
}

const scheduledJobs = new Map<string, ScheduledJob>();
let schedulerInterval: NodeJS.Timeout | null = null;

/**
 * Parse a simple cron expression and get next run time
 * Supports: minute hour dayOfMonth month dayOfWeek
 * Example: "0 9 * * 1" = Every Monday at 9:00 AM
 */
function getNextRunTime(cronExpression: string, from: Date = new Date()): Date {
  const parts = cronExpression.split(" ");
  if (parts.length !== 5) {
    throw new Error(`Invalid cron expression: ${cronExpression}`);
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  const next = new Date(from);
  next.setSeconds(0);
  next.setMilliseconds(0);

  // Simple implementation for common patterns
  // For production, consider using a library like node-cron or cron-parser

  // Handle specific minute
  if (minute !== "*") {
    next.setMinutes(parseInt(minute));
  }

  // Handle specific hour
  if (hour !== "*") {
    next.setHours(parseInt(hour));
  }

  // If the time has passed today, move to next occurrence
  if (next <= from) {
    // Handle day of week
    if (dayOfWeek !== "*") {
      const targetDay = parseInt(dayOfWeek);
      const currentDay = next.getDay();
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0) {
        daysToAdd += 7;
      }
      next.setDate(next.getDate() + daysToAdd);
    } else if (dayOfMonth !== "*") {
      // Handle specific day of month
      const targetDate = parseInt(dayOfMonth);
      if (next.getDate() >= targetDate) {
        next.setMonth(next.getMonth() + 1);
      }
      next.setDate(targetDate);
    } else {
      // Daily job - move to next day
      next.setDate(next.getDate() + 1);
    }
  }

  return next;
}

/**
 * Register a new scheduled job
 */
export function registerJob(
  id: string,
  name: string,
  cronExpression: string,
  handler: () => Promise<void>,
  enabled: boolean = true
): void {
  const job: ScheduledJob = {
    id,
    name,
    cronExpression,
    lastRun: null,
    nextRun: getNextRunTime(cronExpression),
    enabled,
    handler,
  };

  scheduledJobs.set(id, job);
  console.log(`[CronScheduler] Registered job: ${name} (${cronExpression}), next run: ${job.nextRun.toISOString()}`);
}

/**
 * Unregister a scheduled job
 */
export function unregisterJob(id: string): boolean {
  const deleted = scheduledJobs.delete(id);
  if (deleted) {
    console.log(`[CronScheduler] Unregistered job: ${id}`);
  }
  return deleted;
}

/**
 * Enable or disable a job
 */
export function setJobEnabled(id: string, enabled: boolean): boolean {
  const job = scheduledJobs.get(id);
  if (job) {
    job.enabled = enabled;
    console.log(`[CronScheduler] Job ${id} ${enabled ? "enabled" : "disabled"}`);
    return true;
  }
  return false;
}

/**
 * Get all registered jobs
 */
export function getJobs(): ScheduledJob[] {
  return Array.from(scheduledJobs.values());
}

/**
 * Get a specific job
 */
export function getJob(id: string): ScheduledJob | undefined {
  return scheduledJobs.get(id);
}

/**
 * Run a job manually
 */
export async function runJobManually(id: string): Promise<boolean> {
  const job = scheduledJobs.get(id);
  if (!job) {
    console.log(`[CronScheduler] Job not found: ${id}`);
    return false;
  }

  console.log(`[CronScheduler] Manually running job: ${job.name}`);
  try {
    await job.handler();
    job.lastRun = new Date();
    console.log(`[CronScheduler] Job completed: ${job.name}`);
    return true;
  } catch (error) {
    console.error(`[CronScheduler] Job failed: ${job.name}`, error);
    return false;
  }
}

/**
 * Check and run due jobs
 */
async function checkAndRunJobs(): Promise<void> {
  const now = new Date();

  for (const job of Array.from(scheduledJobs.values())) {
    if (!job.enabled) continue;

    if (job.nextRun <= now) {
      console.log(`[CronScheduler] Running scheduled job: ${job.name}`);
      try {
        await job.handler();
        job.lastRun = new Date();
        console.log(`[CronScheduler] Job completed: ${job.name}`);
      } catch (error) {
        console.error(`[CronScheduler] Job failed: ${job.name}`, error);
      }

      // Calculate next run time
      job.nextRun = getNextRunTime(job.cronExpression, new Date());
      console.log(`[CronScheduler] Next run for ${job.name}: ${job.nextRun.toISOString()}`);
    }
  }
}

/**
 * Start the scheduler
 */
export function startScheduler(checkIntervalMs: number = 60000): void {
  if (schedulerInterval) {
    console.log("[CronScheduler] Scheduler already running");
    return;
  }

  console.log("[CronScheduler] Starting scheduler...");

  // Register default jobs
  registerDefaultJobs();

  // Check jobs every minute
  schedulerInterval = setInterval(checkAndRunJobs, checkIntervalMs);
  console.log(`[CronScheduler] Scheduler started, checking every ${checkIntervalMs / 1000}s`);

  // Run initial check
  checkAndRunJobs();
}

/**
 * Stop the scheduler
 */
export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[CronScheduler] Scheduler stopped");
  }
}

/**
 * Register default scheduled jobs
 */
function registerDefaultJobs(): void {
  // Weekly digest - runs every day at 9:00 AM to check for users who need digests
  registerJob(
    "weekly-digest",
    "Weekly Digest Emails",
    "0 9 * * *", // Every day at 9:00 AM
    async () => {
      console.log("[CronScheduler] Processing weekly digests...");
      const result = await processWeeklyDigests();
      console.log(`[CronScheduler] Digest results: ${result.processed} processed, ${result.successful} sent, ${result.failed} failed`);
    },
    true
  );

  // Digest A/B test auto-completion check - runs every hour
  registerJob(
    "digest-ab-test-check",
    "Digest A/B Test Auto-Complete Check",
    "0 * * * *", // Every hour at minute 0
    async () => {
      console.log("[CronScheduler] Checking digest A/B tests for auto-completion...");
      const { processDigestTestsAutoComplete } = await import("../db");
      const result = await processDigestTestsAutoComplete();
      console.log(`[CronScheduler] Auto-complete results: ${result.processed} checked, ${result.completed} completed`);
    },
    true
  );

  // Recommendation generation - runs every 6 hours
  registerJob(
    "generate-recommendations",
    "Generate Template Recommendations",
    "0 */6 * * *", // Every 6 hours
    async () => {
      console.log("[CronScheduler] Generating template recommendations...");
      // This would iterate through active users and generate recommendations
      // For now, recommendations are generated on-demand when users visit the marketplace
      console.log("[CronScheduler] Recommendations are generated on-demand");
    },
    false // Disabled by default since recommendations are on-demand
  );
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus(): {
  running: boolean;
  jobCount: number;
  jobs: Array<{
    id: string;
    name: string;
    enabled: boolean;
    lastRun: string | null;
    nextRun: string;
  }>;
} {
  return {
    running: schedulerInterval !== null,
    jobCount: scheduledJobs.size,
    jobs: Array.from(scheduledJobs.values()).map((job) => ({
      id: job.id,
      name: job.name,
      enabled: job.enabled,
      lastRun: job.lastRun?.toISOString() || null,
      nextRun: job.nextRun.toISOString(),
    })),
  };
}
