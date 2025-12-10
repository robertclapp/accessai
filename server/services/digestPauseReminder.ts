/**
 * Digest Pause Reminder Service
 * 
 * Sends reminder emails to users when their digest pause is about to expire.
 */

import { getDb } from "../db";
import { emailDigestPreferences, users } from "../../drizzle/schema";
import { eq, and, isNotNull, lte, gt, isNull, or } from "drizzle-orm";

interface PauseReminderResult {
  userId: number;
  email: string;
  pauseUntil: Date;
  success: boolean;
  error?: string;
}

/**
 * Check if a reminder should be sent for a given pause state
 */
export function shouldSendReminder(params: {
  isPaused: boolean;
  pauseUntil: Date | null;
  pauseReminderSentAt: Date | null;
}): boolean {
  const { isPaused, pauseUntil, pauseReminderSentAt } = params;
  
  // Not paused - no reminder needed
  if (!isPaused) return false;
  
  // No auto-resume date - no reminder needed
  if (!pauseUntil) return false;
  
  const now = new Date();
  const hoursUntilResume = (pauseUntil.getTime() - now.getTime()) / (60 * 60 * 1000);
  
  // Resume is less than 24 hours away - too late for reminder
  if (hoursUntilResume < 24) return false;
  
  // Resume is more than 48 hours away - too early for reminder
  if (hoursUntilResume > 48) return false;
  
  // Check if reminder was already sent recently (within 24 hours)
  if (pauseReminderSentAt) {
    const hoursSinceReminder = (now.getTime() - pauseReminderSentAt.getTime()) / (60 * 60 * 1000);
    if (hoursSinceReminder < 24) return false;
  }
  
  return true;
}

/**
 * Find users who need a pause reminder (24 hours before auto-resume)
 */
export async function findUsersNeedingPauseReminder(): Promise<Array<{
  userId: number;
  email: string;
  pauseUntil: Date;
  pauseReason: string | null;
}>> {
  const database = await getDb();
  if (!database) return [];
  
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  
  // Find users where:
  // 1. isPaused is true
  // 2. pauseUntil is between 24-48 hours from now
  // 3. No reminder has been sent yet (pauseReminderSentAt is null)
  //    OR reminder was sent more than 24 hours ago
  const reminderCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  const results = await database
    .select({
      userId: emailDigestPreferences.userId,
      email: users.email,
      pauseUntil: emailDigestPreferences.pauseUntil,
      pauseReason: emailDigestPreferences.pauseReason,
    })
    .from(emailDigestPreferences)
    .innerJoin(users, eq(users.id, emailDigestPreferences.userId))
    .where(
      and(
        eq(emailDigestPreferences.isPaused, true),
        isNotNull(emailDigestPreferences.pauseUntil),
        gt(emailDigestPreferences.pauseUntil, in24Hours),
        lte(emailDigestPreferences.pauseUntil, in48Hours),
        or(
          isNull(emailDigestPreferences.pauseReminderSentAt),
          lte(emailDigestPreferences.pauseReminderSentAt, reminderCutoff)
        )
      )
    );
  
  return results.map((r: { userId: number; email: string | null; pauseUntil: Date | null; pauseReason: string | null }) => ({
    userId: r.userId,
    email: r.email || "",
    pauseUntil: r.pauseUntil!,
    pauseReason: r.pauseReason,
  }));
}

/**
 * Generate the pause reminder email HTML
 */
export function generatePauseReminderEmail(params: {
  pauseUntil: Date;
  pauseReason: string | null;
}): { subject: string; html: string } {
  const { pauseUntil, pauseReason } = params;
  
  const resumeDate = pauseUntil.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  
  const resumeTime = pauseUntil.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  
  const subject = "Your email digests will resume tomorrow";
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Digest Pause Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                📬 Digest Reminder
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px 0; color: #18181b; font-size: 20px; font-weight: 600;">
                Your email digests will resume soon
              </h2>
              
              <p style="margin: 0 0 24px 0; color: #52525b; font-size: 16px; line-height: 1.6;">
                This is a friendly reminder that your paused email digests are scheduled to automatically resume.
              </p>
              
              <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; color: #1e40af; font-size: 14px; font-weight: 600;">
                  📅 Resuming on:
                </p>
                <p style="margin: 0; color: #1e3a8a; font-size: 18px; font-weight: 700;">
                  ${resumeDate} at ${resumeTime}
                </p>
              </div>
              
              ${pauseReason ? `
              <div style="background-color: #fafafa; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                <p style="margin: 0 0 4px 0; color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
                  Pause Reason
                </p>
                <p style="margin: 0; color: #3f3f46; font-size: 14px;">
                  ${pauseReason}
                </p>
              </div>
              ` : ""}
              
              <p style="margin: 0 0 24px 0; color: #52525b; font-size: 14px; line-height: 1.6;">
                If you'd like to extend your pause or make changes to your digest settings, you can do so from your account settings.
              </p>
              
              <div style="text-align: center;">
                <a href="#" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                  Manage Digest Settings
                </a>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 24px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                You're receiving this because you have an active pause on your email digests.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
  
  return { subject, html };
}

/**
 * Mark that a reminder was sent for a user
 */
export async function markReminderSent(userId: number): Promise<void> {
  const database = await getDb();
  if (!database) return;
  
  await database
    .update(emailDigestPreferences)
    .set({ pauseReminderSentAt: new Date() })
    .where(eq(emailDigestPreferences.userId, userId));
}

/**
 * Send pause reminder emails to all eligible users
 */
export async function sendPauseReminders(): Promise<PauseReminderResult[]> {
  const usersNeedingReminder = await findUsersNeedingPauseReminder();
  const results: PauseReminderResult[] = [];
  
  for (const user of usersNeedingReminder) {
    try {
      const { subject, html } = generatePauseReminderEmail({
        pauseUntil: user.pauseUntil,
        pauseReason: user.pauseReason,
      });
      
      // In a real implementation, this would send the email
      // For now, we just mark it as sent
      await markReminderSent(user.userId);
      
      results.push({
        userId: user.userId,
        email: user.email,
        pauseUntil: user.pauseUntil,
        success: true,
      });
    } catch (error) {
      results.push({
        userId: user.userId,
        email: user.email,
        pauseUntil: user.pauseUntil,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
  
  return results;
}
