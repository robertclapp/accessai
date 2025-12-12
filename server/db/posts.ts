/**
 * Post Database Operations
 *
 * Handles all social media post-related database operations including:
 * - Post CRUD operations
 * - Scheduling operations
 * - Analytics updates
 */

import { eq, and, desc, gte, lte, sql, count, not } from "drizzle-orm";
import { posts, InsertPost, Post } from "../../drizzle/schema";
import { getDb } from "./connection";

// ============================================
// POST CRUD OPERATIONS
// ============================================

export async function createPost(post: InsertPost) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(posts).values(post);
  return result[0].insertId;
}

export async function getPostById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserPosts(userId: number, options?: {
  status?: Post["status"];
  platform?: Post["platform"];
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  // Build conditions array
  const conditions = [eq(posts.userId, userId)];

  if (options?.status) {
    conditions.push(eq(posts.status, options.status));
  }
  if (options?.platform) {
    conditions.push(eq(posts.platform, options.platform));
  }

  return await db.select().from(posts)
    .where(and(...conditions))
    .orderBy(desc(posts.createdAt))
    .limit(options?.limit ?? 50)
    .offset(options?.offset ?? 0);
}

export async function updatePost(id: number, data: Partial<InsertPost>) {
  const db = await getDb();
  if (!db) return;

  await db.update(posts).set(data).where(eq(posts.id, id));
}

export async function deletePost(id: number) {
  const db = await getDb();
  if (!db) return;

  await db.delete(posts).where(eq(posts.id, id));
}

// ============================================
// SCHEDULING OPERATIONS
// ============================================

export async function getScheduledPosts(userId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(posts)
    .where(and(
      eq(posts.userId, userId),
      eq(posts.status, "scheduled"),
      gte(posts.scheduledAt, startDate),
      lte(posts.scheduledAt, endDate)
    ))
    .orderBy(posts.scheduledAt);
}

export async function getScheduledPostsDue(dueBy: Date) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select()
    .from(posts)
    .where(
      and(
        eq(posts.status, "scheduled"),
        lte(posts.scheduledAt, dueBy)
      )
    )
    .orderBy(posts.scheduledAt);

  return result;
}

// ============================================
// ANALYTICS OPERATIONS
// ============================================

export async function updatePostAnalytics(id: number, analytics: Post["analytics"]) {
  const db = await getDb();
  if (!db) return;

  await db.update(posts).set({ analytics }).where(eq(posts.id, id));
}

export async function getUserAnalyticsSummary(userId: number) {
  const db = await getDb();
  if (!db) return null;

  // Use efficient SQL aggregation for counts instead of fetching all posts
  const statusCounts = await db
    .select({
      status: posts.status,
      cnt: count(),
    })
    .from(posts)
    .where(eq(posts.userId, userId))
    .groupBy(posts.status);

  const statusMap = new Map(statusCounts.map(r => [r.status, Number(r.cnt)]));
  const publishedPosts = statusMap.get("published") || 0;
  const scheduledPosts = statusMap.get("scheduled") || 0;
  const draftPosts = statusMap.get("draft") || 0;
  const failedPosts = statusMap.get("failed") || 0;
  const totalPosts = publishedPosts + scheduledPosts + draftPosts + failedPosts;

  // Get average accessibility score using SQL aggregation
  const [accessibilityResult] = await db
    .select({
      avgScore: sql<number>`AVG(${posts.accessibilityScore})`,
    })
    .from(posts)
    .where(and(eq(posts.userId, userId), not(sql`${posts.accessibilityScore} IS NULL`)));

  const avgAccessibilityScore = Math.round(accessibilityResult?.avgScore || 0);

  // For analytics JSON fields, fetch only published posts with analytics
  // This is more efficient than fetching all posts
  const postsWithAnalytics = await db
    .select({ analytics: posts.analytics })
    .from(posts)
    .where(and(eq(posts.userId, userId), eq(posts.status, "published")));

  let totalImpressions = 0;
  let totalEngagements = 0;
  let totalClicks = 0;

  for (const p of postsWithAnalytics) {
    if (p.analytics) {
      totalImpressions += p.analytics.impressions || 0;
      totalEngagements += p.analytics.engagements || 0;
      totalClicks += p.analytics.clicks || 0;
    }
  }

  return {
    totalPosts,
    publishedPosts,
    scheduledPosts,
    draftPosts,
    avgAccessibilityScore,
    totalImpressions,
    totalEngagements,
    totalClicks,
    engagementRate: totalImpressions > 0 ? (totalEngagements / totalImpressions * 100).toFixed(2) : "0.00"
  };
}
