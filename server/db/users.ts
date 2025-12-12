/**
 * User Database Operations
 *
 * Handles all user-related database operations including:
 * - User CRUD operations
 * - Preferences management
 * - Subscription management
 * - Profile updates
 */

import { eq, sql } from "drizzle-orm";
import { users, InsertUser } from "../../drizzle/schema";
import { getDb } from "./connection";
import { ENV } from "../_core/env";

// ============================================
// USER CRUD OPERATIONS
// ============================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByStripeCustomerId(stripeCustomerId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users)
    .where(eq(users.stripeCustomerId, stripeCustomerId))
    .limit(1);

  return result[0];
}

// ============================================
// USER PREFERENCES
// ============================================

export async function updateUserPreferences(userId: number, preferences: {
  accessibilityPreferences?: InsertUser["accessibilityPreferences"];
  writingStyleProfile?: InsertUser["writingStyleProfile"];
}) {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set(preferences).where(eq(users.id, userId));
}

export async function updateUserProfile(userId: number, data: { name?: string; email?: string }) {
  const db = await getDb();
  if (!db) return;

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email;

  if (Object.keys(updateData).length > 0) {
    await db.update(users).set(updateData).where(eq(users.id, userId));
  }
}

export async function updateUserAccessibilityPreferences(userId: number, prefs: {
  highContrast?: boolean;
  dyslexiaFont?: boolean;
  fontSize?: "small" | "medium" | "large" | "xlarge";
  reduceMotion?: boolean;
  screenReaderOptimized?: boolean;
  voiceInputEnabled?: boolean;
  keyboardShortcutsEnabled?: boolean;
}) {
  const db = await getDb();
  if (!db) return;

  const user = await getUserById(userId);
  const currentPrefs = user?.accessibilityPreferences || {};
  const updatedPrefs = { ...currentPrefs, ...prefs };

  await db.update(users).set({ accessibilityPreferences: updatedPrefs }).where(eq(users.id, userId));
}

export async function updateUserWritingStyle(userId: number, style: {
  tone?: string;
  formality?: "casual" | "professional" | "academic";
  industry?: string;
  targetAudience?: string;
}) {
  const db = await getDb();
  if (!db) return;

  const user = await getUserById(userId);
  const currentStyle = user?.writingStyleProfile || {};
  const updatedStyle = { ...currentStyle, ...style };

  await db.update(users).set({ writingStyleProfile: updatedStyle }).where(eq(users.id, userId));
}

// ============================================
// SUBSCRIPTION MANAGEMENT
// ============================================

export async function updateUserSubscription(userId: number, subscription: {
  subscriptionTier?: "free" | "creator" | "pro";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: "active" | "canceled" | "past_due" | "trialing";
}) {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set(subscription).where(eq(users.id, userId));
}

export async function incrementUserPostCount(userId: number) {
  const db = await getDb();
  if (!db) return;

  await db.update(users)
    .set({ monthlyPostsGenerated: sql`${users.monthlyPostsGenerated} + 1` })
    .where(eq(users.id, userId));
}

export async function resetMonthlyPostCount(userId: number) {
  const db = await getDb();
  if (!db) return;

  await db.update(users)
    .set({
      monthlyPostsGenerated: 0,
      lastPostResetDate: new Date()
    })
    .where(eq(users.id, userId));
}

// ============================================
// ONBOARDING
// ============================================

export async function updateUserOnboarding(
  userId: number,
  data: {
    hasCompletedTour?: boolean;
    tourCompletedAt?: Date;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set(data).where(eq(users.id, userId));
}
