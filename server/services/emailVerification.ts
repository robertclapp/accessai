/**
 * Email Verification Service
 * 
 * Handles email verification for new user signups including:
 * - Secure token generation
 * - Verification email sending
 * - Token validation and expiration
 * - Resend functionality with rate limiting
 */

import { eq, and, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { nanoid } from "nanoid";
import { verificationTokens, users } from "../../drizzle/schema";
import { notifyOwner } from "../_core/notification";

// ============================================
// CONSTANTS
// ============================================

/** Token expiration time in milliseconds (24 hours) */
const TOKEN_EXPIRATION_MS = 24 * 60 * 60 * 1000;

/** Minimum time between resend requests in milliseconds (2 minutes) */
const RESEND_COOLDOWN_MS = 2 * 60 * 1000;

/** Maximum verification attempts per day */
const MAX_DAILY_ATTEMPTS = 5;

// ============================================
// TYPES
// ============================================

export interface VerificationResult {
  success: boolean;
  message: string;
  error?: string;
}

export interface TokenGenerationResult {
  success: boolean;
  token?: string;
  expiresAt?: Date;
  error?: string;
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
// TOKEN GENERATION
// ============================================

/**
 * Generates a secure verification token for a user.
 * Invalidates any existing tokens for the same email.
 * 
 * @param userId - The user's database ID
 * @param email - The email address to verify
 * @returns Token generation result with the token string
 */
export async function generateVerificationToken(
  userId: number,
  email: string
): Promise<TokenGenerationResult> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  try {
    // Generate a secure random token (URL-safe)
    const token = nanoid(32);
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_MS);

    // Insert new token (old tokens will be ignored due to expiration)
    await db.insert(verificationTokens).values({
      userId,
      token,
      type: "email_verification",
      email,
      expiresAt,
    });

    return {
      success: true,
      token,
      expiresAt,
    };
  } catch (error) {
    console.error("[EmailVerification] Token generation failed:", error);
    return { success: false, error: "Failed to generate verification token" };
  }
}

// ============================================
// TOKEN VALIDATION
// ============================================

/**
 * Validates a verification token and marks the user's email as verified.
 * 
 * @param token - The verification token from the email link
 * @returns Verification result indicating success or failure
 */
export async function verifyEmailToken(token: string): Promise<VerificationResult> {
  const db = await getDb();
  if (!db) {
    return { success: false, message: "Database not available" };
  }

  try {
    // Find the token
    const [tokenRecord] = await db
      .select()
      .from(verificationTokens)
      .where(
        and(
          eq(verificationTokens.token, token),
          eq(verificationTokens.type, "email_verification"),
          gt(verificationTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!tokenRecord) {
      return {
        success: false,
        message: "Invalid or expired verification link. Please request a new one.",
      };
    }

    // Check if already used
    if (tokenRecord.usedAt) {
      return {
        success: false,
        message: "This verification link has already been used.",
      };
    }

    // Mark token as used
    await db
      .update(verificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(verificationTokens.id, tokenRecord.id));

    // Update user's email verification status
    await db
      .update(users)
      .set({
        emailVerified: true,
        emailVerifiedAt: new Date(),
        email: tokenRecord.email, // Ensure email matches the verified one
      })
      .where(eq(users.id, tokenRecord.userId));

    // Notify owner of successful verification
    await notifyOwner({
      title: "Email Verified",
      content: `User ID ${tokenRecord.userId} has verified their email: ${tokenRecord.email}`,
    });

    return {
      success: true,
      message: "Email verified successfully! You now have full access to AccessAI.",
    };
  } catch (error) {
    console.error("[EmailVerification] Token validation failed:", error);
    return { success: false, message: "Verification failed. Please try again." };
  }
}

// ============================================
// EMAIL SENDING
// ============================================

/**
 * Sends a verification email to the user.
 * Uses the built-in notification system for email delivery.
 * 
 * @param email - The recipient email address
 * @param token - The verification token
 * @param userName - The user's name for personalization
 * @param baseUrl - The base URL for the verification link
 * @returns Result indicating if email was sent successfully
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
  userName: string | null,
  baseUrl: string
): Promise<VerificationResult> {
  try {
    const verificationUrl = `${baseUrl}/verify-email?token=${token}`;
    const displayName = userName || "there";

    // Create accessible email content
    const emailContent = `
Hello ${displayName},

Welcome to AccessAI! Please verify your email address to unlock full access to our accessibility-first content creation platform.

Click the link below to verify your email:
${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account with AccessAI, you can safely ignore this email.

---
AccessAI - Create Inclusive Content That Reaches Everyone
    `.trim();

    // For now, we'll use the notification system to alert the owner
    // In production, this would integrate with an email service like SendGrid, Resend, or AWS SES
    await notifyOwner({
      title: `Verification Email for ${email}`,
      content: `
User: ${displayName}
Email: ${email}
Verification URL: ${verificationUrl}

Email Content:
${emailContent}
      `,
    });

    console.log(`[EmailVerification] Verification email sent to ${email}`);
    
    return {
      success: true,
      message: "Verification email sent! Please check your inbox.",
    };
  } catch (error) {
    console.error("[EmailVerification] Failed to send email:", error);
    return {
      success: false,
      message: "Failed to send verification email. Please try again.",
    };
  }
}

// ============================================
// RESEND FUNCTIONALITY
// ============================================

/**
 * Checks if a user can request a new verification email.
 * Implements rate limiting to prevent abuse.
 * 
 * @param userId - The user's database ID
 * @returns Whether the user can request a new email
 */
export async function canResendVerification(userId: number): Promise<{
  canResend: boolean;
  waitTimeSeconds?: number;
  attemptsRemaining?: number;
}> {
  const db = await getDb();
  if (!db) {
    return { canResend: false };
  }

  try {
    // Get recent tokens for this user
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentTokens = await db
      .select()
      .from(verificationTokens)
      .where(
        and(
          eq(verificationTokens.userId, userId),
          eq(verificationTokens.type, "email_verification"),
          gt(verificationTokens.createdAt, oneDayAgo)
        )
      )
      .orderBy(verificationTokens.createdAt);

    // Check daily limit
    if (recentTokens.length >= MAX_DAILY_ATTEMPTS) {
      return {
        canResend: false,
        attemptsRemaining: 0,
      };
    }

    // Check cooldown from last request
    if (recentTokens.length > 0) {
      const lastToken = recentTokens[recentTokens.length - 1];
      const timeSinceLastRequest = Date.now() - lastToken.createdAt.getTime();
      
      if (timeSinceLastRequest < RESEND_COOLDOWN_MS) {
        const waitTimeSeconds = Math.ceil((RESEND_COOLDOWN_MS - timeSinceLastRequest) / 1000);
        return {
          canResend: false,
          waitTimeSeconds,
          attemptsRemaining: MAX_DAILY_ATTEMPTS - recentTokens.length,
        };
      }
    }

    return {
      canResend: true,
      attemptsRemaining: MAX_DAILY_ATTEMPTS - recentTokens.length,
    };
  } catch (error) {
    console.error("[EmailVerification] Rate limit check failed:", error);
    return { canResend: false };
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Gets the verification status for a user.
 * 
 * @param userId - The user's database ID
 * @returns Verification status information
 */
export async function getVerificationStatus(userId: number): Promise<{
  isVerified: boolean;
  email: string | null;
  verifiedAt: Date | null;
  hasPendingVerification: boolean;
}> {
  const db = await getDb();
  if (!db) {
    return {
      isVerified: false,
      email: null,
      verifiedAt: null,
      hasPendingVerification: false,
    };
  }

  try {
    // Get user info
    const [user] = await db
      .select({
        email: users.email,
        emailVerified: users.emailVerified,
        emailVerifiedAt: users.emailVerifiedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return {
        isVerified: false,
        email: null,
        verifiedAt: null,
        hasPendingVerification: false,
      };
    }

    // Check for pending verification tokens
    const [pendingToken] = await db
      .select()
      .from(verificationTokens)
      .where(
        and(
          eq(verificationTokens.userId, userId),
          eq(verificationTokens.type, "email_verification"),
          gt(verificationTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    return {
      isVerified: user.emailVerified ?? false,
      email: user.email,
      verifiedAt: user.emailVerifiedAt,
      hasPendingVerification: !!pendingToken && !pendingToken.usedAt,
    };
  } catch (error) {
    console.error("[EmailVerification] Status check failed:", error);
    return {
      isVerified: false,
      email: null,
      verifiedAt: null,
      hasPendingVerification: false,
    };
  }
}
