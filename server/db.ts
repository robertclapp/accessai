import { eq, and, desc, gte, lte, sql, or, like, asc, ne, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  users,
  templateRatings,
  templateVersions,
  TemplateRating,
  TemplateVersion,
  InsertUser, User,
  posts, InsertPost, Post,
  templates, InsertTemplate, Template,
  knowledgeBase, InsertKnowledgeBaseItem, KnowledgeBaseItem,
  teams, InsertTeam, Team,
  teamMembers, InsertTeamMember, TeamMember,
  approvals, InsertApproval,
  socialAccounts, InsertSocialAccount,
  generatedImages, InsertGeneratedImage,
  voiceTranscriptions, InsertVoiceTranscription,
  accessibilityReports, InsertAccessibilityReport,
  notificationPreferences, InsertNotificationPreference,
  blogCategories, InsertBlogCategory,
  blogTags, InsertBlogTag,
  blogPosts, InsertBlogPost,
  blogPostTags,
  testimonials, InsertTestimonial,
  featuredPartners, InsertFeaturedPartner,
  platformGoals, InsertPlatformGoal, PlatformGoal,
  goalHistory, InsertGoalHistory,
  industryBenchmarks, InsertIndustryBenchmark, IndustryBenchmark,
  emailDigestPreferences, InsertEmailDigestPreference, EmailDigestPreference,
  abTests, InsertABTest, ABTest,
  abTestVariants, InsertABTestVariant, ABTestVariant,
  cwPresets, InsertCWPreset, CWPreset,
  mastodonTemplates, InsertMastodonTemplate, MastodonTemplate,
  digestDeliveryTracking, InsertDigestDeliveryTracking, DigestDeliveryTracking,
  templateCategories,
  abTestTemplates, InsertABTestTemplate, ABTestTemplate, InsertTemplateCategory, TemplateCategory,
  digestABTests, InsertDigestABTest, DigestABTest
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================
// USER OPERATIONS
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
      values.role = 'admin';
      updateSet.role = 'admin';
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

export async function updateUserPreferences(userId: number, preferences: {
  accessibilityPreferences?: InsertUser["accessibilityPreferences"];
  writingStyleProfile?: InsertUser["writingStyleProfile"];
}) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(users).set(preferences).where(eq(users.id, userId));
}

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
// POST OPERATIONS
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

export async function updatePostAnalytics(id: number, analytics: Post["analytics"]) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(posts).set({ analytics }).where(eq(posts.id, id));
}

// ============================================
// TEMPLATE OPERATIONS
// ============================================

export async function createTemplate(template: InsertTemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(templates).values(template);
  return result[0].insertId;
}

export async function getTemplateById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(templates).where(eq(templates.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserTemplates(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get user's own templates and public templates
  return await db.select().from(templates)
    .where(eq(templates.userId, userId))
    .orderBy(desc(templates.usageCount));
}

export async function getPublicTemplates() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(templates)
    .where(eq(templates.isPublic, true))
    .orderBy(desc(templates.usageCount));
}

export async function updateTemplate(id: number, data: Partial<InsertTemplate>) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(templates).set(data).where(eq(templates.id, id));
}

export async function incrementTemplateUsage(id: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(templates)
    .set({ usageCount: sql`${templates.usageCount} + 1` })
    .where(eq(templates.id, id));
}

export async function deleteTemplate(id: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.delete(templates).where(eq(templates.id, id));
}

// ============================================
// KNOWLEDGE BASE OPERATIONS
// ============================================

export async function createKnowledgeBaseItem(item: InsertKnowledgeBaseItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(knowledgeBase).values(item);
  return result[0].insertId;
}

export async function getKnowledgeBaseItem(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(knowledgeBase).where(eq(knowledgeBase.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserKnowledgeBase(userId: number, type?: KnowledgeBaseItem["type"]) {
  const db = await getDb();
  if (!db) return [];
  
  if (type) {
    return await db.select().from(knowledgeBase)
      .where(and(eq(knowledgeBase.userId, userId), eq(knowledgeBase.type, type)))
      .orderBy(desc(knowledgeBase.priority));
  }
  
  return await db.select().from(knowledgeBase)
    .where(eq(knowledgeBase.userId, userId))
    .orderBy(desc(knowledgeBase.priority));
}

export async function getAiContextItems(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(knowledgeBase)
    .where(and(
      eq(knowledgeBase.userId, userId),
      eq(knowledgeBase.includeInAiContext, true)
    ))
    .orderBy(desc(knowledgeBase.priority))
    .limit(10); // Limit to prevent context overflow
}

export async function updateKnowledgeBaseItem(id: number, data: Partial<InsertKnowledgeBaseItem>) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(knowledgeBase).set(data).where(eq(knowledgeBase.id, id));
}

export async function deleteKnowledgeBaseItem(id: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.delete(knowledgeBase).where(eq(knowledgeBase.id, id));
}

// ============================================
// TEAM OPERATIONS
// ============================================

export async function createTeam(team: InsertTeam) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(teams).values(team);
  return result[0].insertId;
}

export async function getTeamById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserTeams(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get teams where user is a member
  const memberships = await db.select().from(teamMembers)
    .where(eq(teamMembers.userId, userId));
  
  if (memberships.length === 0) return [];
  
  const teamIds = memberships.map(m => m.teamId);
  const teamResults = await Promise.all(
    teamIds.map(id => db.select().from(teams).where(eq(teams.id, id)).limit(1))
  );
  
  return teamResults.flat().filter(Boolean);
}

export async function updateTeam(id: number, data: Partial<InsertTeam>) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(teams).set(data).where(eq(teams.id, id));
}

export async function deleteTeam(id: number) {
  const db = await getDb();
  if (!db) return;
  
  // Delete team members first
  await db.delete(teamMembers).where(eq(teamMembers.teamId, id));
  await db.delete(teams).where(eq(teams.id, id));
}

// ============================================
// TEAM MEMBER OPERATIONS
// ============================================

export async function addTeamMember(member: InsertTeamMember) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(teamMembers).values(member);
  return result[0].insertId;
}

export async function getTeamMembers(teamId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));
}

export async function getTeamMember(teamId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function updateTeamMember(id: number, data: Partial<InsertTeamMember>) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(teamMembers).set(data).where(eq(teamMembers.id, id));
}

export async function removeTeamMember(teamId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.delete(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
}

// ============================================
// APPROVAL OPERATIONS
// ============================================

export async function createApproval(approval: InsertApproval) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(approvals).values(approval);
  return result[0].insertId;
}

export async function getPendingApprovals(teamId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(approvals)
    .where(and(eq(approvals.teamId, teamId), eq(approvals.status, "pending")))
    .orderBy(desc(approvals.requestedAt));
}

export async function updateApproval(id: number, data: Partial<InsertApproval>) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(approvals).set(data).where(eq(approvals.id, id));
}

// ============================================
// SOCIAL ACCOUNT OPERATIONS
// ============================================

export async function connectSocialAccount(account: InsertSocialAccount) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(socialAccounts).values(account);
  return result[0].insertId;
}

export async function getUserSocialAccounts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(socialAccounts)
    .where(eq(socialAccounts.userId, userId));
}

export async function disconnectSocialAccount(id: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.delete(socialAccounts).where(eq(socialAccounts.id, id));
}

// ============================================
// GENERATED IMAGE OPERATIONS
// ============================================

export async function saveGeneratedImage(image: InsertGeneratedImage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(generatedImages).values(image);
  return result[0].insertId;
}

export async function getUserGeneratedImages(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(generatedImages)
    .where(eq(generatedImages.userId, userId))
    .orderBy(desc(generatedImages.createdAt))
    .limit(limit);
}

// ============================================
// VOICE TRANSCRIPTION OPERATIONS
// ============================================

export async function saveVoiceTranscription(transcription: InsertVoiceTranscription) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(voiceTranscriptions).values(transcription);
  return result[0].insertId;
}

export async function getUserTranscriptions(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(voiceTranscriptions)
    .where(eq(voiceTranscriptions.userId, userId))
    .orderBy(desc(voiceTranscriptions.createdAt))
    .limit(limit);
}

// ============================================
// ACCESSIBILITY REPORT OPERATIONS
// ============================================

export async function createAccessibilityReport(report: InsertAccessibilityReport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(accessibilityReports).values(report);
  return result[0].insertId;
}

export async function getOpenAccessibilityReports() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(accessibilityReports)
    .where(eq(accessibilityReports.status, "open"))
    .orderBy(desc(accessibilityReports.createdAt));
}

export async function updateAccessibilityReport(id: number, data: Partial<InsertAccessibilityReport>) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(accessibilityReports).set(data).where(eq(accessibilityReports.id, id));
}

// ============================================
// ANALYTICS HELPERS
// ============================================

export async function getUserAnalyticsSummary(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const userPosts = await db.select().from(posts)
    .where(eq(posts.userId, userId));
  
  const totalPosts = userPosts.length;
  const publishedPosts = userPosts.filter(p => p.status === "published").length;
  const scheduledPosts = userPosts.filter(p => p.status === "scheduled").length;
  const draftPosts = userPosts.filter(p => p.status === "draft").length;
  
  // Calculate average accessibility score
  const postsWithScores = userPosts.filter(p => p.accessibilityScore !== null);
  const avgAccessibilityScore = postsWithScores.length > 0
    ? postsWithScores.reduce((sum, p) => sum + (p.accessibilityScore || 0), 0) / postsWithScores.length
    : 0;
  
  // Aggregate analytics
  let totalImpressions = 0;
  let totalEngagements = 0;
  let totalClicks = 0;
  
  userPosts.forEach(p => {
    if (p.analytics) {
      totalImpressions += p.analytics.impressions || 0;
      totalEngagements += p.analytics.engagements || 0;
      totalClicks += p.analytics.clicks || 0;
    }
  });
  
  return {
    totalPosts,
    publishedPosts,
    scheduledPosts,
    draftPosts,
    avgAccessibilityScore: Math.round(avgAccessibilityScore),
    totalImpressions,
    totalEngagements,
    totalClicks,
    engagementRate: totalImpressions > 0 ? (totalEngagements / totalImpressions * 100).toFixed(2) : "0.00"
  };
}


// ============================================
// STRIPE USER LOOKUP
// ============================================

export async function getUserByStripeCustomerId(stripeCustomerId: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users)
    .where(eq(users.stripeCustomerId, stripeCustomerId))
    .limit(1);
  
  return result[0];
}


// ============================================
// SETTINGS & PROFILE FUNCTIONS
// ============================================

/**
 * Update user profile information
 */
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

/**
 * Update user accessibility preferences
 */
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

/**
 * Update user writing style preferences
 */
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
// NOTIFICATION PREFERENCES FUNCTIONS
// ============================================

/**
 * Get user notification preferences
 */
export async function getNotificationPreferences(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).limit(1);
  return result[0] || null;
}

/**
 * Update user notification preferences
 */
export async function updateNotificationPreferences(userId: number, prefs: Partial<InsertNotificationPreference>) {
  const db = await getDb();
  if (!db) return;
  
  const existing = await getNotificationPreferences(userId);
  
  if (existing) {
    await db.update(notificationPreferences).set(prefs).where(eq(notificationPreferences.userId, userId));
  } else {
    await db.insert(notificationPreferences).values({ userId, ...prefs });
  }
}

// ============================================
// SOCIAL ACCOUNTS EXTENDED FUNCTIONS
// ============================================

/**
 * Get a specific social account by platform
 */
export async function getSocialAccountByPlatform(userId: number, platform: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(socialAccounts)
    .where(and(
      eq(socialAccounts.userId, userId),
      eq(socialAccounts.platform, platform as "linkedin" | "twitter" | "facebook" | "instagram")
    ))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Disconnect a social account (with user verification)
 */
export async function disconnectSocialAccountByUser(userId: number, accountId: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.delete(socialAccounts).where(
    and(
      eq(socialAccounts.id, accountId),
      eq(socialAccounts.userId, userId)
    )
  );
}

/**
 * Update social account tokens
 */
export async function updateSocialAccountTokens(accountId: number, tokens: {
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
}) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(socialAccounts).set(tokens).where(eq(socialAccounts.id, accountId));
}


// ============================================
// SCHEDULED POSTING OPERATIONS
// ============================================

/**
 * Gets all scheduled posts that are due for publishing
 * @param dueBy - Posts scheduled before this date are considered due
 */
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

/**
 * Updates a social account with new token information
 */
export async function updateSocialAccount(accountId: number, data: {
  accessToken?: string;
  refreshToken?: string | null;
  tokenExpiresAt?: Date | null;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(socialAccounts)
    .set({
      ...data,
      updatedAt: new Date()
    })
    .where(eq(socialAccounts.id, accountId));
}


// ============================================
// ONBOARDING OPERATIONS
// ============================================

/**
 * Update user onboarding status
 */
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


// ============================================
// BLOG FUNCTIONS
// ============================================

export async function getBlogCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(blogCategories).orderBy(blogCategories.name);
}

export async function getBlogTags() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(blogTags).orderBy(blogTags.name);
}

export async function getPublishedBlogPosts(options: {
  limit?: number;
  offset?: number;
  categorySlug?: string;
  tagSlug?: string;
  featured?: boolean;
}) {
  const db = await getDb();
  if (!db) return { posts: [], total: 0 };
  
  const { limit = 10, offset = 0 } = options;
  
  const postsResult = await db
    .select({
      post: blogPosts,
      category: blogCategories,
      author: { id: users.id, name: users.name },
    })
    .from(blogPosts)
    .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
    .leftJoin(users, eq(blogPosts.authorId, users.id))
    .where(eq(blogPosts.status, "published"))
    .orderBy(desc(blogPosts.publishedAt))
    .limit(limit)
    .offset(offset);
  
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(blogPosts)
    .where(eq(blogPosts.status, "published"));
  
  return {
    posts: postsResult.map(p => ({ ...p.post, category: p.category, author: p.author })),
    total: countResult[0]?.count || 0,
  };
}

export async function getBlogPostBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select({ post: blogPosts, category: blogCategories, author: { id: users.id, name: users.name } })
    .from(blogPosts)
    .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
    .leftJoin(users, eq(blogPosts.authorId, users.id))
    .where(eq(blogPosts.slug, slug))
    .limit(1);
  
  if (result.length === 0) return null;
  
  const tags = await db
    .select({ tag: blogTags })
    .from(blogPostTags)
    .innerJoin(blogTags, eq(blogPostTags.tagId, blogTags.id))
    .where(eq(blogPostTags.postId, result[0].post.id));
  
  return { ...result[0].post, category: result[0].category, author: result[0].author, tags: tags.map(t => t.tag) };
}

export async function incrementBlogPostViews(postId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(blogPosts).set({ viewCount: sql`${blogPosts.viewCount} + 1` }).where(eq(blogPosts.id, postId));
}

export async function getRelatedBlogPosts(postId: number, categoryId: number | null, limit = 3) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(blogPosts.status, "published"), sql`${blogPosts.id} != ${postId}`];
  if (categoryId) conditions.push(eq(blogPosts.categoryId, categoryId));
  
  return db.select().from(blogPosts).where(and(...conditions)).orderBy(desc(blogPosts.publishedAt)).limit(limit);
}

export async function createBlogPost(post: InsertBlogPost) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(blogPosts).values(post);
  return result[0].insertId;
}

export async function updateBlogPost(postId: number, updates: Partial<InsertBlogPost>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(blogPosts).set(updates).where(eq(blogPosts.id, postId));
}

export async function deleteBlogPost(postId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(blogPostTags).where(eq(blogPostTags.postId, postId));
  await db.delete(blogPosts).where(eq(blogPosts.id, postId));
}

export async function getAllBlogPosts() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ post: blogPosts, category: blogCategories })
    .from(blogPosts)
    .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
    .orderBy(desc(blogPosts.createdAt));
}

export async function upsertBlogCategory(category: InsertBlogCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(blogCategories).where(eq(blogCategories.slug, category.slug)).limit(1);
  if (existing.length > 0) return existing[0].id;
  const result = await db.insert(blogCategories).values(category);
  return result[0].insertId;
}

export async function upsertBlogTag(tag: InsertBlogTag) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(blogTags).where(eq(blogTags.slug, tag.slug)).limit(1);
  if (existing.length > 0) return existing[0].id;
  const result = await db.insert(blogTags).values(tag);
  return result[0].insertId;
}

export async function setBlogPostTags(postId: number, tagIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(blogPostTags).where(eq(blogPostTags.postId, postId));
  if (tagIds.length > 0) {
    await db.insert(blogPostTags).values(tagIds.map(tagId => ({ postId, tagId })));
  }
}


// ============================================================================
// TESTIMONIALS & SOCIAL PROOF
// ============================================================================

/**
 * Get all active testimonials for public display
 */
export async function getActiveTestimonials() {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(testimonials)
    .where(eq(testimonials.isActive, true))
    .orderBy(testimonials.displayOrder);
}

/**
 * Get featured testimonials for homepage highlight
 */
export async function getFeaturedTestimonials(limit = 3) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(testimonials)
    .where(and(eq(testimonials.isActive, true), eq(testimonials.featured, true)))
    .orderBy(testimonials.displayOrder)
    .limit(limit);
}

/**
 * Get all testimonials for admin management
 */
export async function getAllTestimonials() {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(testimonials)
    .orderBy(testimonials.displayOrder);
}

/**
 * Create a new testimonial
 */
export async function createTestimonial(data: InsertTestimonial) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(testimonials).values(data);
  return result[0].insertId;
}

/**
 * Update an existing testimonial
 */
export async function updateTestimonial(id: number, data: Partial<InsertTestimonial>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(testimonials).set(data).where(eq(testimonials.id, id));
}

/**
 * Delete a testimonial
 */
export async function deleteTestimonial(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(testimonials).where(eq(testimonials.id, id));
}

/**
 * Get all active featured partners for public display
 */
export async function getActiveFeaturedPartners() {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(featuredPartners)
    .where(eq(featuredPartners.isActive, true))
    .orderBy(featuredPartners.displayOrder);
}

/**
 * Get all featured partners for admin management
 */
export async function getAllFeaturedPartners() {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(featuredPartners)
    .orderBy(featuredPartners.displayOrder);
}

/**
 * Create a new featured partner
 */
export async function createFeaturedPartner(data: InsertFeaturedPartner) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(featuredPartners).values(data);
  return result[0].insertId;
}

/**
 * Update an existing featured partner
 */
export async function updateFeaturedPartner(id: number, data: Partial<InsertFeaturedPartner>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(featuredPartners).set(data).where(eq(featuredPartners.id, id));
}

/**
 * Delete a featured partner
 */
export async function deleteFeaturedPartner(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(featuredPartners).where(eq(featuredPartners.id, id));
}


// ============================================
// PLATFORM ANALYTICS COMPARISON
// ============================================

/**
 * Platform analytics metrics structure
 */
export interface PlatformMetrics {
  platform: string;
  postCount: number;
  publishedCount: number;
  totalImpressions: number;
  totalEngagements: number;
  totalClicks: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  avgAccessibilityScore: number;
  engagementRate: number;
  bestPerformingPost?: {
    id: number;
    title: string | null;
    engagements: number;
    impressions: number;
  };
}

/**
 * Get analytics comparison across all platforms for a user
 */
export async function getPlatformAnalyticsComparison(
  userId: number,
  dateRange?: { start: Date; end: Date }
): Promise<PlatformMetrics[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Build conditions
  const conditions = [eq(posts.userId, userId)];
  
  if (dateRange) {
    conditions.push(gte(posts.createdAt, dateRange.start));
    conditions.push(lte(posts.createdAt, dateRange.end));
  }
  
  // Get all user posts
  const userPosts = await db.select().from(posts).where(and(...conditions));
  
  // Group by platform
  const platformGroups: Record<string, typeof userPosts> = {};
  
  userPosts.forEach(post => {
    if (post.platform !== "all") {
      if (!platformGroups[post.platform]) {
        platformGroups[post.platform] = [];
      }
      platformGroups[post.platform].push(post);
    }
  });
  
  // Calculate metrics for each platform
  const metrics: PlatformMetrics[] = [];
  
  for (const [platform, platformPosts] of Object.entries(platformGroups)) {
    const publishedPosts = platformPosts.filter(p => p.status === "published");
    
    let totalImpressions = 0;
    let totalEngagements = 0;
    let totalClicks = 0;
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let accessibilitySum = 0;
    let accessibilityCount = 0;
    let bestPost: PlatformMetrics["bestPerformingPost"] = undefined;
    let bestEngagement = 0;
    
    platformPosts.forEach(post => {
      if (post.analytics) {
        const analytics = post.analytics;
        const impressions = analytics.impressions || 0;
        const engagements = analytics.engagements || 0;
        const clicks = analytics.clicks || 0;
        const likes = analytics.likes || 0;
        const comments = analytics.comments || 0;
        const shares = analytics.shares || 0;
        
        totalImpressions += impressions;
        totalEngagements += engagements;
        totalClicks += clicks;
        totalLikes += likes;
        totalComments += comments;
        totalShares += shares;
        
        // Track best performing post
        if (engagements > bestEngagement) {
          bestEngagement = engagements;
          bestPost = {
            id: post.id,
            title: post.title,
            engagements,
            impressions
          };
        }
      }
      
      if (post.accessibilityScore !== null) {
        accessibilitySum += post.accessibilityScore;
        accessibilityCount++;
      }
    });
    
    const engagementRate = totalImpressions > 0 
      ? (totalEngagements / totalImpressions) * 100 
      : 0;
    
    metrics.push({
      platform,
      postCount: platformPosts.length,
      publishedCount: publishedPosts.length,
      totalImpressions,
      totalEngagements,
      totalClicks,
      totalLikes,
      totalComments,
      totalShares,
      avgAccessibilityScore: accessibilityCount > 0 
        ? Math.round(accessibilitySum / accessibilityCount) 
        : 0,
      engagementRate: Math.round(engagementRate * 100) / 100,
      bestPerformingPost: bestPost
    });
  }
  
  // Sort by engagement rate (best performing first)
  metrics.sort((a, b) => b.engagementRate - a.engagementRate);
  
  return metrics;
}

/**
 * Get platform performance trends over time
 */
export async function getPlatformTrends(
  userId: number,
  platform: string,
  period: "week" | "month" | "quarter" | "year" = "month"
): Promise<Array<{
  date: string;
  impressions: number;
  engagements: number;
  posts: number;
  engagementRate: number;
}>> {
  const db = await getDb();
  if (!db) return [];
  
  // Calculate date range based on period
  const now = new Date();
  const startDate = new Date();
  
  switch (period) {
    case "week":
      startDate.setDate(now.getDate() - 7);
      break;
    case "month":
      startDate.setMonth(now.getMonth() - 1);
      break;
    case "quarter":
      startDate.setMonth(now.getMonth() - 3);
      break;
    case "year":
      startDate.setFullYear(now.getFullYear() - 1);
      break;
  }
  
  const conditions = [
    eq(posts.userId, userId),
    eq(posts.platform, platform as "linkedin" | "twitter" | "facebook" | "instagram" | "threads" | "all"),
    gte(posts.createdAt, startDate)
  ];
  
  const userPosts = await db.select().from(posts).where(and(...conditions));
  
  // Group by date
  const dateGroups: Record<string, typeof userPosts> = {};
  
  userPosts.forEach(post => {
    const dateKey = post.createdAt.toISOString().split("T")[0];
    if (!dateGroups[dateKey]) {
      dateGroups[dateKey] = [];
    }
    dateGroups[dateKey].push(post);
  });
  
  // Calculate daily metrics
  const trends = Object.entries(dateGroups).map(([date, datePosts]) => {
    let impressions = 0;
    let engagements = 0;
    
    datePosts.forEach(post => {
      if (post.analytics) {
        impressions += post.analytics.impressions || 0;
        engagements += post.analytics.engagements || 0;
      }
    });
    
    return {
      date,
      impressions,
      engagements,
      posts: datePosts.length,
      engagementRate: impressions > 0 ? Math.round((engagements / impressions) * 10000) / 100 : 0
    };
  });
  
  // Sort by date
  trends.sort((a, b) => a.date.localeCompare(b.date));
  
  return trends;
}

/**
 * Get the best performing platform for a user
 */
export async function getBestPerformingPlatform(userId: number): Promise<{
  platform: string;
  engagementRate: number;
  totalEngagements: number;
  recommendation: string;
} | null> {
  const metrics = await getPlatformAnalyticsComparison(userId);
  
  if (metrics.length === 0) return null;
  
  // Find platform with highest engagement rate (with minimum posts threshold)
  const qualifiedPlatforms = metrics.filter(m => m.publishedCount >= 3);
  
  if (qualifiedPlatforms.length === 0) {
    // Not enough data, return the one with most posts
    const mostPosts = metrics.reduce((a, b) => a.postCount > b.postCount ? a : b);
    return {
      platform: mostPosts.platform,
      engagementRate: mostPosts.engagementRate,
      totalEngagements: mostPosts.totalEngagements,
      recommendation: `Post more content on ${mostPosts.platform} to gather meaningful analytics data.`
    };
  }
  
  const best = qualifiedPlatforms[0]; // Already sorted by engagement rate
  
  const recommendations: Record<string, string> = {
    linkedin: "Your LinkedIn content resonates well. Consider posting more thought leadership and industry insights.",
    twitter: "Your X/Twitter content performs best. Focus on timely, conversational posts and threads.",
    facebook: "Facebook works well for your content. Try more personal stories and community engagement.",
    instagram: "Instagram is your top performer. Invest in visual content and Stories.",
    threads: "Threads is working well for you. Keep the conversational, authentic tone."
  };
  
  return {
    platform: best.platform,
    engagementRate: best.engagementRate,
    totalEngagements: best.totalEngagements,
    recommendation: recommendations[best.platform] || `Continue focusing on ${best.platform} for best results.`
  };
}


// ============================================
// PLATFORM GOALS
// ============================================

/**
 * Get all goals for a user
 */
export async function getUserPlatformGoals(userId: number): Promise<PlatformGoal[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(platformGoals)
    .where(eq(platformGoals.userId, userId))
    .orderBy(desc(platformGoals.createdAt));
}

/**
 * Get active goals for a user
 */
export async function getActiveGoals(userId: number): Promise<PlatformGoal[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(platformGoals)
    .where(and(
      eq(platformGoals.userId, userId),
      eq(platformGoals.isActive, true)
    ))
    .orderBy(platformGoals.platform);
}

/**
 * Get a specific goal by ID
 */
export async function getPlatformGoal(goalId: number, userId: number): Promise<PlatformGoal | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(platformGoals)
    .where(and(
      eq(platformGoals.id, goalId),
      eq(platformGoals.userId, userId)
    ))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Create a new platform goal
 */
export async function createPlatformGoal(data: InsertPlatformGoal): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Deactivate existing goals for the same platform
  await db
    .update(platformGoals)
    .set({ isActive: false })
    .where(and(
      eq(platformGoals.userId, data.userId),
      eq(platformGoals.platform, data.platform),
      eq(platformGoals.isActive, true)
    ));
  
  const result = await db.insert(platformGoals).values(data);
  return result[0].insertId;
}

/**
 * Update a platform goal
 */
export async function updatePlatformGoal(goalId: number, userId: number, data: Partial<InsertPlatformGoal>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(platformGoals)
    .set(data)
    .where(and(
      eq(platformGoals.id, goalId),
      eq(platformGoals.userId, userId)
    ));
}

/**
 * Delete a platform goal
 */
export async function deletePlatformGoal(goalId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete associated history
  await db.delete(goalHistory).where(eq(goalHistory.goalId, goalId));
  
  // Delete the goal
  await db
    .delete(platformGoals)
    .where(and(
      eq(platformGoals.id, goalId),
      eq(platformGoals.userId, userId)
    ));
}

/**
 * Mark a goal as achieved
 */
export async function markGoalAchieved(goalId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(platformGoals)
    .set({ achievedAt: new Date() })
    .where(and(
      eq(platformGoals.id, goalId),
      eq(platformGoals.userId, userId)
    ));
}

/**
 * Get goal progress for a user
 * Compares current metrics against goal targets
 */
export async function getGoalProgress(userId: number): Promise<Array<{
  goal: PlatformGoal;
  currentEngagementRate: number;
  progressPercent: number;
  postsThisPeriod: number;
  isAchieved: boolean;
}>> {
  const goals = await getActiveGoals(userId);
  const metrics = await getPlatformAnalyticsComparison(userId);
  
  const progress = goals.map(goal => {
    const platformMetric = metrics.find(m => m.platform === goal.platform);
    const currentRate = platformMetric?.engagementRate || 0;
    const targetRate = goal.targetEngagementRate / 100; // Convert from stored int (500 = 5.00%)
    const progressPercent = targetRate > 0 ? Math.min(100, Math.round((currentRate / targetRate) * 100)) : 0;
    
    return {
      goal,
      currentEngagementRate: currentRate,
      progressPercent,
      postsThisPeriod: platformMetric?.postCount || 0,
      isAchieved: currentRate >= targetRate
    };
  });
  
  return progress;
}

/**
 * Record goal history snapshot
 */
export async function recordGoalHistory(data: InsertGoalHistory): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(goalHistory).values(data);
  return result[0].insertId;
}

/**
 * Get goal history for a specific goal
 */
export async function getGoalHistoryForGoal(goalId: number): Promise<Array<typeof goalHistory.$inferSelect>> {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(goalHistory)
    .where(eq(goalHistory.goalId, goalId))
    .orderBy(desc(goalHistory.periodEnd));
}

// ============================================
// INDUSTRY BENCHMARKS
// ============================================

/**
 * Get benchmarks for a specific industry and platform
 */
export async function getIndustryBenchmark(
  industry: string,
  platform: string
): Promise<IndustryBenchmark | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(industryBenchmarks)
    .where(and(
      eq(industryBenchmarks.industry, industry),
      eq(industryBenchmarks.platform, platform as "linkedin" | "twitter" | "facebook" | "instagram" | "threads")
    ))
    .orderBy(desc(industryBenchmarks.benchmarkYear))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Get all benchmarks for a specific industry
 */
export async function getIndustryBenchmarks(industry: string): Promise<IndustryBenchmark[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(industryBenchmarks)
    .where(eq(industryBenchmarks.industry, industry))
    .orderBy(industryBenchmarks.platform);
}

/**
 * Get all available industries
 */
export async function getAvailableIndustries(): Promise<string[]> {
  const db = await getDb();
  if (!db) return getDefaultIndustries();
  
  const result = await db
    .selectDistinct({ industry: industryBenchmarks.industry })
    .from(industryBenchmarks);
  
  const industries = result.map(r => r.industry);
  return industries.length > 0 ? industries : getDefaultIndustries();
}

/**
 * Default industries when no benchmarks exist
 */
function getDefaultIndustries(): string[] {
  return [
    "Technology",
    "Healthcare",
    "Finance",
    "Retail & E-commerce",
    "Education",
    "Marketing & Advertising",
    "Real Estate",
    "Travel & Hospitality",
    "Food & Beverage",
    "Entertainment",
    "Non-profit",
    "Professional Services",
    "Manufacturing",
    "Media & Publishing"
  ];
}

/**
 * Get default benchmark data (used when no custom benchmarks exist)
 * Based on industry research and averages
 */
export function getDefaultBenchmarks(): Array<{
  industry: string;
  platform: string;
  avgEngagementRate: number;
  medianEngagementRate: number;
  topPerformerRate: number;
  avgPostsPerWeek: number;
}> {
  // Default benchmarks based on industry research (2024 data)
  return [
    // Technology
    { industry: "Technology", platform: "linkedin", avgEngagementRate: 280, medianEngagementRate: 220, topPerformerRate: 550, avgPostsPerWeek: 5 },
    { industry: "Technology", platform: "twitter", avgEngagementRate: 150, medianEngagementRate: 100, topPerformerRate: 350, avgPostsPerWeek: 14 },
    { industry: "Technology", platform: "facebook", avgEngagementRate: 80, medianEngagementRate: 50, topPerformerRate: 200, avgPostsPerWeek: 3 },
    { industry: "Technology", platform: "instagram", avgEngagementRate: 180, medianEngagementRate: 140, topPerformerRate: 400, avgPostsPerWeek: 4 },
    { industry: "Technology", platform: "threads", avgEngagementRate: 200, medianEngagementRate: 150, topPerformerRate: 450, avgPostsPerWeek: 7 },
    
    // Healthcare
    { industry: "Healthcare", platform: "linkedin", avgEngagementRate: 320, medianEngagementRate: 260, topPerformerRate: 600, avgPostsPerWeek: 4 },
    { industry: "Healthcare", platform: "twitter", avgEngagementRate: 120, medianEngagementRate: 80, topPerformerRate: 280, avgPostsPerWeek: 10 },
    { industry: "Healthcare", platform: "facebook", avgEngagementRate: 100, medianEngagementRate: 70, topPerformerRate: 250, avgPostsPerWeek: 3 },
    { industry: "Healthcare", platform: "instagram", avgEngagementRate: 220, medianEngagementRate: 180, topPerformerRate: 480, avgPostsPerWeek: 3 },
    { industry: "Healthcare", platform: "threads", avgEngagementRate: 180, medianEngagementRate: 130, topPerformerRate: 380, avgPostsPerWeek: 5 },
    
    // Finance
    { industry: "Finance", platform: "linkedin", avgEngagementRate: 250, medianEngagementRate: 200, topPerformerRate: 500, avgPostsPerWeek: 5 },
    { industry: "Finance", platform: "twitter", avgEngagementRate: 100, medianEngagementRate: 70, topPerformerRate: 250, avgPostsPerWeek: 12 },
    { industry: "Finance", platform: "facebook", avgEngagementRate: 60, medianEngagementRate: 40, topPerformerRate: 150, avgPostsPerWeek: 2 },
    { industry: "Finance", platform: "instagram", avgEngagementRate: 150, medianEngagementRate: 110, topPerformerRate: 350, avgPostsPerWeek: 3 },
    { industry: "Finance", platform: "threads", avgEngagementRate: 160, medianEngagementRate: 120, topPerformerRate: 360, avgPostsPerWeek: 6 },
    
    // Marketing & Advertising
    { industry: "Marketing & Advertising", platform: "linkedin", avgEngagementRate: 350, medianEngagementRate: 280, topPerformerRate: 700, avgPostsPerWeek: 7 },
    { industry: "Marketing & Advertising", platform: "twitter", avgEngagementRate: 200, medianEngagementRate: 150, topPerformerRate: 450, avgPostsPerWeek: 20 },
    { industry: "Marketing & Advertising", platform: "facebook", avgEngagementRate: 120, medianEngagementRate: 90, topPerformerRate: 280, avgPostsPerWeek: 5 },
    { industry: "Marketing & Advertising", platform: "instagram", avgEngagementRate: 280, medianEngagementRate: 220, topPerformerRate: 580, avgPostsPerWeek: 7 },
    { industry: "Marketing & Advertising", platform: "threads", avgEngagementRate: 250, medianEngagementRate: 190, topPerformerRate: 520, avgPostsPerWeek: 10 },
    
    // Retail & E-commerce
    { industry: "Retail & E-commerce", platform: "linkedin", avgEngagementRate: 200, medianEngagementRate: 160, topPerformerRate: 420, avgPostsPerWeek: 4 },
    { industry: "Retail & E-commerce", platform: "twitter", avgEngagementRate: 130, medianEngagementRate: 90, topPerformerRate: 300, avgPostsPerWeek: 15 },
    { industry: "Retail & E-commerce", platform: "facebook", avgEngagementRate: 90, medianEngagementRate: 60, topPerformerRate: 220, avgPostsPerWeek: 5 },
    { industry: "Retail & E-commerce", platform: "instagram", avgEngagementRate: 250, medianEngagementRate: 200, topPerformerRate: 520, avgPostsPerWeek: 7 },
    { industry: "Retail & E-commerce", platform: "threads", avgEngagementRate: 200, medianEngagementRate: 150, topPerformerRate: 420, avgPostsPerWeek: 8 },
    
    // Education
    { industry: "Education", platform: "linkedin", avgEngagementRate: 380, medianEngagementRate: 300, topPerformerRate: 750, avgPostsPerWeek: 4 },
    { industry: "Education", platform: "twitter", avgEngagementRate: 180, medianEngagementRate: 130, topPerformerRate: 400, avgPostsPerWeek: 10 },
    { industry: "Education", platform: "facebook", avgEngagementRate: 150, medianEngagementRate: 110, topPerformerRate: 350, avgPostsPerWeek: 4 },
    { industry: "Education", platform: "instagram", avgEngagementRate: 300, medianEngagementRate: 240, topPerformerRate: 620, avgPostsPerWeek: 5 },
    { industry: "Education", platform: "threads", avgEngagementRate: 250, medianEngagementRate: 190, topPerformerRate: 520, avgPostsPerWeek: 6 }
  ];
}

/**
 * Compare user metrics against industry benchmarks
 */
export async function compareWithBenchmarks(
  userId: number,
  industry: string
): Promise<Array<{
  platform: string;
  userEngagementRate: number;
  industryAverage: number;
  industryMedian: number;
  topPerformerThreshold: number;
  percentile: number;
  comparison: "below_average" | "average" | "above_average" | "top_performer";
  recommendation: string;
}>> {
  const userMetrics = await getPlatformAnalyticsComparison(userId);
  const benchmarks = await getIndustryBenchmarks(industry);
  
  // Use default benchmarks if none exist in DB
  const defaultBenchmarks = getDefaultBenchmarks().filter(b => b.industry === industry);
  const benchmarkData = benchmarks.length > 0 
    ? benchmarks 
    : defaultBenchmarks.map(b => ({
        ...b,
        id: 0,
        dataSource: "Default industry averages",
        dataCollectedAt: null,
        benchmarkYear: 2024,
        avgImpressionsPerPost: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
  
  const comparisons = userMetrics.map(metric => {
    const benchmark = benchmarkData.find(b => b.platform === metric.platform);
    
    if (!benchmark) {
      return {
        platform: metric.platform,
        userEngagementRate: metric.engagementRate,
        industryAverage: 0,
        industryMedian: 0,
        topPerformerThreshold: 0,
        percentile: 50,
        comparison: "average" as const,
        recommendation: "No benchmark data available for this platform in your industry."
      };
    }
    
    const avgRate = benchmark.avgEngagementRate / 100;
    const medianRate = (benchmark.medianEngagementRate || benchmark.avgEngagementRate) / 100;
    const topRate = (benchmark.topPerformerRate || benchmark.avgEngagementRate * 2) / 100;
    
    // Calculate percentile (simplified estimation)
    let percentile: number;
    let comparison: "below_average" | "average" | "above_average" | "top_performer";
    let recommendation: string;
    
    if (metric.engagementRate >= topRate) {
      percentile = 90 + Math.min(10, ((metric.engagementRate - topRate) / topRate) * 10);
      comparison = "top_performer";
      recommendation = `Outstanding! You're in the top 10% for ${metric.platform} in ${industry}. Keep doing what you're doing!`;
    } else if (metric.engagementRate >= avgRate) {
      percentile = 50 + ((metric.engagementRate - avgRate) / (topRate - avgRate)) * 40;
      comparison = "above_average";
      recommendation = `Great work! You're above the industry average on ${metric.platform}. Focus on consistency to reach top performer status.`;
    } else if (metric.engagementRate >= medianRate * 0.7) {
      percentile = 30 + ((metric.engagementRate - medianRate * 0.7) / (avgRate - medianRate * 0.7)) * 20;
      comparison = "average";
      recommendation = `You're performing at industry average on ${metric.platform}. Try experimenting with different content types to boost engagement.`;
    } else {
      percentile = Math.max(5, (metric.engagementRate / (medianRate * 0.7)) * 30);
      comparison = "below_average";
      recommendation = `There's room for improvement on ${metric.platform}. Consider posting more frequently and engaging with your audience's comments.`;
    }
    
    return {
      platform: metric.platform,
      userEngagementRate: metric.engagementRate,
      industryAverage: avgRate,
      industryMedian: medianRate,
      topPerformerThreshold: topRate,
      percentile: Math.round(percentile),
      comparison,
      recommendation
    };
  });
  
  return comparisons;
}

/**
 * Seed industry benchmarks (for initial setup)
 */
export async function seedIndustryBenchmarks(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const defaults = getDefaultBenchmarks();
  
  for (const benchmark of defaults) {
    const existing = await db
      .select()
      .from(industryBenchmarks)
      .where(and(
        eq(industryBenchmarks.industry, benchmark.industry),
        eq(industryBenchmarks.platform, benchmark.platform as "linkedin" | "twitter" | "facebook" | "instagram" | "threads")
      ))
      .limit(1);
    
    if (existing.length === 0) {
      await db.insert(industryBenchmarks).values({
        industry: benchmark.industry,
        platform: benchmark.platform as "linkedin" | "twitter" | "facebook" | "instagram" | "threads",
        avgEngagementRate: benchmark.avgEngagementRate,
        medianEngagementRate: benchmark.medianEngagementRate,
        topPerformerRate: benchmark.topPerformerRate,
        avgPostsPerWeek: benchmark.avgPostsPerWeek,
        dataSource: "Industry research 2024",
        benchmarkYear: 2024
      });
    }
  }
}


// ============================================
// A/B TESTING FUNCTIONS
// ============================================

/**
 * Create a new A/B test
 */
export async function createABTest(data: InsertABTest): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(abTests).values(data);
  return result[0].insertId;
}

/**
 * Get all A/B tests for a user
 */
export async function getUserABTests(userId: number): Promise<ABTest[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(abTests)
    .where(eq(abTests.userId, userId))
    .orderBy(desc(abTests.createdAt));
}

/**
 * Get a specific A/B test by ID
 */
export async function getABTest(testId: number, userId: number): Promise<ABTest | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(abTests)
    .where(and(eq(abTests.id, testId), eq(abTests.userId, userId)))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Get A/B test with variants
 */
export async function getABTestWithVariants(testId: number, userId: number): Promise<{
  test: ABTest;
  variants: ABTestVariant[];
} | null> {
  const db = await getDb();
  if (!db) return null;
  
  const test = await getABTest(testId, userId);
  if (!test) return null;
  
  const variants = await db
    .select()
    .from(abTestVariants)
    .where(eq(abTestVariants.testId, testId))
    .orderBy(abTestVariants.label);
  
  return { test, variants };
}

/**
 * Update an A/B test
 */
export async function updateABTest(testId: number, userId: number, data: Partial<InsertABTest>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(abTests)
    .set(data)
    .where(and(eq(abTests.id, testId), eq(abTests.userId, userId)));
}

/**
 * Delete an A/B test and its variants
 */
export async function deleteABTest(testId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete variants first
  await db.delete(abTestVariants).where(eq(abTestVariants.testId, testId));
  
  // Delete test
  await db.delete(abTests).where(and(eq(abTests.id, testId), eq(abTests.userId, userId)));
}

/**
 * Create a variant for an A/B test
 */
export async function createABTestVariant(data: InsertABTestVariant): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(abTestVariants).values(data);
  return result[0].insertId;
}

/**
 * Update a variant
 */
export async function updateABTestVariant(variantId: number, data: Partial<InsertABTestVariant>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(abTestVariants)
    .set(data)
    .where(eq(abTestVariants.id, variantId));
}

/**
 * Delete a variant
 */
export async function deleteABTestVariant(variantId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(abTestVariants).where(eq(abTestVariants.id, variantId));
}

/**
 * Start an A/B test
 */
export async function startABTest(testId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(abTests)
    .set({
      status: "active",
      startedAt: new Date()
    })
    .where(and(eq(abTests.id, testId), eq(abTests.userId, userId)));
}

/**
 * Complete an A/B test with winner
 */
export async function completeABTest(
  testId: number, 
  userId: number, 
  winningVariantId: number,
  confidenceLevel: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(abTests)
    .set({
      status: "completed",
      endedAt: new Date(),
      winningVariantId,
      confidenceLevel
    })
    .where(and(eq(abTests.id, testId), eq(abTests.userId, userId)));
}

/**
 * Update variant analytics
 */
export async function updateVariantAnalytics(
  variantId: number,
  analytics: {
    impressions?: number;
    engagements?: number;
    clicks?: number;
    shares?: number;
    comments?: number;
    likes?: number;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get current values
  const [variant] = await db
    .select()
    .from(abTestVariants)
    .where(eq(abTestVariants.id, variantId))
    .limit(1);
  
  if (!variant) return;
  
  const newImpressions = (variant.impressions || 0) + (analytics.impressions || 0);
  const newEngagements = (variant.engagements || 0) + (analytics.engagements || 0);
  const newClicks = (variant.clicks || 0) + (analytics.clicks || 0);
  const newShares = (variant.shares || 0) + (analytics.shares || 0);
  const newComments = (variant.comments || 0) + (analytics.comments || 0);
  const newLikes = (variant.likes || 0) + (analytics.likes || 0);
  
  // Calculate engagement rate in basis points
  const engagementRate = newImpressions > 0 
    ? Math.round((newEngagements / newImpressions) * 10000) 
    : 0;
  
  await db
    .update(abTestVariants)
    .set({
      impressions: newImpressions,
      engagements: newEngagements,
      clicks: newClicks,
      shares: newShares,
      comments: newComments,
      likes: newLikes,
      engagementRate
    })
    .where(eq(abTestVariants.id, variantId));
}

/**
 * Get active A/B tests that need to be checked for completion
 */
export async function getActiveABTests(): Promise<ABTest[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(abTests)
    .where(eq(abTests.status, "active"));
}

/**
 * Calculate statistical significance between two variants
 * Returns confidence level (0-100)
 */
export function calculateStatisticalSignificance(
  variantA: { impressions: number; engagements: number },
  variantB: { impressions: number; engagements: number }
): number {
  // Simple chi-square test for A/B testing
  const rateA = variantA.impressions > 0 ? variantA.engagements / variantA.impressions : 0;
  const rateB = variantB.impressions > 0 ? variantB.engagements / variantB.impressions : 0;
  
  const totalImpressions = variantA.impressions + variantB.impressions;
  const totalEngagements = variantA.engagements + variantB.engagements;
  
  if (totalImpressions < 100 || totalEngagements < 10) {
    return 0; // Not enough data
  }
  
  const pooledRate = totalEngagements / totalImpressions;
  const standardError = Math.sqrt(
    pooledRate * (1 - pooledRate) * (1 / variantA.impressions + 1 / variantB.impressions)
  );
  
  if (standardError === 0) return 0;
  
  const zScore = Math.abs(rateA - rateB) / standardError;
  
  // Convert z-score to confidence level
  // z=1.65 -> 90%, z=1.96 -> 95%, z=2.58 -> 99%
  if (zScore >= 2.58) return 99;
  if (zScore >= 1.96) return 95;
  if (zScore >= 1.65) return 90;
  if (zScore >= 1.28) return 80;
  if (zScore >= 1.04) return 70;
  if (zScore >= 0.84) return 60;
  
  return Math.round(zScore * 30); // Rough approximation for lower values
}

/**
 * Determine the winner of an A/B test
 */
export async function determineABTestWinner(testId: number): Promise<{
  winnerId: number | null;
  confidence: number;
  recommendation: string;
} | null> {
  const db = await getDb();
  if (!db) return null;
  
  const variants = await db
    .select()
    .from(abTestVariants)
    .where(eq(abTestVariants.testId, testId))
    .orderBy(desc(abTestVariants.engagementRate));
  
  if (variants.length < 2) {
    return { winnerId: null, confidence: 0, recommendation: "Need at least 2 variants to determine a winner" };
  }
  
  const [best, second] = variants;
  
  const confidence = calculateStatisticalSignificance(
    { impressions: best.impressions || 0, engagements: best.engagements || 0 },
    { impressions: second.impressions || 0, engagements: second.engagements || 0 }
  );
  
  if (confidence >= 95) {
    return {
      winnerId: best.id,
      confidence,
      recommendation: `Variant ${best.label} is the clear winner with ${(best.engagementRate || 0) / 100}% engagement rate (${confidence}% confidence)`
    };
  } else if (confidence >= 80) {
    return {
      winnerId: best.id,
      confidence,
      recommendation: `Variant ${best.label} is likely the winner but consider running longer for more confidence`
    };
  } else {
    return {
      winnerId: null,
      confidence,
      recommendation: "Results are not statistically significant yet. Continue running the test."
    };
  }
}


// ============================================
// BULK A/B TEST GROUP OPERATIONS
// ============================================

/**
 * Get all tests in a bulk test group
 */
export async function getBulkTestGroup(bulkTestGroupId: string, userId: number): Promise<ABTest[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(abTests)
    .where(and(
      eq(abTests.bulkTestGroupId, bulkTestGroupId),
      eq(abTests.userId, userId)
    ))
    .orderBy(abTests.platform);
}

/**
 * Get bulk test group comparison data with variants
 */
export async function getBulkTestGroupComparison(bulkTestGroupId: string, userId: number): Promise<{
  tests: (ABTest & { variants: ABTestVariant[] })[];
  summary: {
    totalTests: number;
    completedTests: number;
    bestPlatform: string | null;
    bestEngagementRate: number;
  };
}> {
  const db = await getDb();
  if (!db) return { tests: [], summary: { totalTests: 0, completedTests: 0, bestPlatform: null, bestEngagementRate: 0 } };
  
  const tests = await db
    .select()
    .from(abTests)
    .where(and(
      eq(abTests.bulkTestGroupId, bulkTestGroupId),
      eq(abTests.userId, userId)
    ))
    .orderBy(abTests.platform);
  
  const testsWithVariants = await Promise.all(
    tests.map(async (test) => {
      const variants = await db
        .select()
        .from(abTestVariants)
        .where(eq(abTestVariants.testId, test.id));
      return { ...test, variants };
    })
  );
  
  // Calculate summary
  const completedTests = tests.filter(t => t.status === "completed").length;
  
  // Find best performing platform based on winning variant engagement rate
  let bestPlatform: string | null = null;
  let bestEngagementRate = 0;
  
  for (const test of testsWithVariants) {
    if (test.winningVariantId) {
      const winner = test.variants.find(v => v.id === test.winningVariantId);
      if (winner && (winner.engagementRate || 0) > bestEngagementRate) {
        bestEngagementRate = winner.engagementRate || 0;
        bestPlatform = test.platform;
      }
    }
  }
  
  return {
    tests: testsWithVariants,
    summary: {
      totalTests: tests.length,
      completedTests,
      bestPlatform,
      bestEngagementRate
    }
  };
}

/**
 * Get all bulk test groups for a user
 */
export async function getUserBulkTestGroups(userId: number): Promise<{
  groupId: string;
  testCount: number;
  platforms: string[];
  createdAt: Date;
  name: string;
}[]> {
  const db = await getDb();
  if (!db) return [];
  
  const tests = await db
    .select()
    .from(abTests)
    .where(and(
      eq(abTests.userId, userId),
      sql`${abTests.bulkTestGroupId} IS NOT NULL`
    ))
    .orderBy(desc(abTests.createdAt));
  
  // Group by bulkTestGroupId
  const groups = new Map<string, { tests: ABTest[]; name: string; createdAt: Date }>();
  
  for (const test of tests) {
    if (!test.bulkTestGroupId) continue;
    
    if (!groups.has(test.bulkTestGroupId)) {
      groups.set(test.bulkTestGroupId, {
        tests: [],
        name: test.name.replace(/ \([^)]+\)$/, ""), // Remove platform suffix
        createdAt: test.createdAt
      });
    }
    groups.get(test.bulkTestGroupId)!.tests.push(test);
  }
  
  return Array.from(groups.entries()).map(([groupId, data]) => ({
    groupId,
    testCount: data.tests.length,
    platforms: data.tests.map(t => t.platform),
    createdAt: data.createdAt,
    name: data.name
  }));
}


// ============================================
// CONTENT WARNING PRESET OPERATIONS
// ============================================

/**
 * Get all CW presets for a user (including defaults)
 */
export async function getUserCWPresets(userId: number): Promise<CWPreset[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(cwPresets)
    .where(or(
      eq(cwPresets.userId, userId),
      eq(cwPresets.isDefault, true)
    ))
    .orderBy(desc(cwPresets.usageCount), asc(cwPresets.name));
}

/**
 * Create a new CW preset
 */
export async function createCWPreset(data: InsertCWPreset): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(cwPresets).values(data);
  return result[0].insertId;
}

/**
 * Update a CW preset
 */
export async function updateCWPreset(presetId: number, userId: number, data: Partial<InsertCWPreset>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(cwPresets)
    .set(data)
    .where(and(
      eq(cwPresets.id, presetId),
      eq(cwPresets.userId, userId),
      eq(cwPresets.isDefault, false) // Can't edit default presets
    ));
}

/**
 * Delete a CW preset
 */
export async function deleteCWPreset(presetId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .delete(cwPresets)
    .where(and(
      eq(cwPresets.id, presetId),
      eq(cwPresets.userId, userId),
      eq(cwPresets.isDefault, false) // Can't delete default presets
    ));
}

/**
 * Increment usage count for a CW preset
 */
export async function incrementCWPresetUsage(presetId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db
    .update(cwPresets)
    .set({ usageCount: sql`${cwPresets.usageCount} + 1` })
    .where(eq(cwPresets.id, presetId));
}

/**
 * Seed default CW presets for a user
 */
export async function seedDefaultCWPresets(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const defaults = [
    { name: "Politics", text: "Politics" },
    { name: "Spoiler", text: "Spoiler" },
    { name: "Food", text: "Food" },
    { name: "Mental Health", text: "Mental Health" },
    { name: "Violence", text: "Violence/Gore" },
    { name: "NSFW", text: "NSFW" },
    { name: "Eye Contact", text: "Eye Contact" },
    { name: "Flashing Images", text: "Flashing Images/GIF" },
  ];
  
  for (const preset of defaults) {
    await db.insert(cwPresets).values({
      userId,
      name: preset.name,
      text: preset.text,
      isDefault: true,
      usageCount: 0,
    });
  }
}



// ============================================
// MASTODON TEMPLATES
// ============================================

/**
 * Get all Mastodon templates for a user (including system templates)
 */
export async function getMastodonTemplates(userId: number): Promise<MastodonTemplate[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(mastodonTemplates)
    .where(or(
      eq(mastodonTemplates.userId, userId),
      eq(mastodonTemplates.isSystem, true),
      eq(mastodonTemplates.isPublic, true)
    ))
    .orderBy(desc(mastodonTemplates.usageCount), mastodonTemplates.name);
}

/**
 * Get a specific Mastodon template
 */
export async function getMastodonTemplate(templateId: number, userId: number): Promise<MastodonTemplate | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(mastodonTemplates)
    .where(and(
      eq(mastodonTemplates.id, templateId),
      or(
        eq(mastodonTemplates.userId, userId),
        eq(mastodonTemplates.isSystem, true),
        eq(mastodonTemplates.isPublic, true)
      )
    ))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Create a Mastodon template
 */
export async function createMastodonTemplate(data: InsertMastodonTemplate): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(mastodonTemplates).values(data);
  return result[0].insertId;
}

/**
 * Update a Mastodon template
 */
export async function updateMastodonTemplate(
  templateId: number, 
  userId: number, 
  data: Partial<InsertMastodonTemplate>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(mastodonTemplates)
    .set(data)
    .where(and(
      eq(mastodonTemplates.id, templateId),
      eq(mastodonTemplates.userId, userId)
    ));
}

/**
 * Delete a Mastodon template
 */
export async function deleteMastodonTemplate(templateId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .delete(mastodonTemplates)
    .where(and(
      eq(mastodonTemplates.id, templateId),
      eq(mastodonTemplates.userId, userId),
      eq(mastodonTemplates.isSystem, false) // Can't delete system templates
    ));
}

/**
 * Increment usage count for a Mastodon template
 */
export async function incrementMastodonTemplateUsage(templateId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db
    .update(mastodonTemplates)
    .set({ usageCount: sql`${mastodonTemplates.usageCount} + 1` })
    .where(eq(mastodonTemplates.id, templateId));
}

/**
 * Seed default Mastodon templates
 */
export async function seedMastodonTemplates(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if system templates already exist
  const existing = await db
    .select()
    .from(mastodonTemplates)
    .where(eq(mastodonTemplates.isSystem, true))
    .limit(1);
  
  if (existing.length > 0) return;
  
  const defaults: InsertMastodonTemplate[] = [
    {
      name: "News Share",
      description: "Share news articles with appropriate content warnings",
      category: "news",
      content: "📰 {headline}\n\n{summary}\n\n🔗 {link}\n\n#News #{topic}",
      defaultCW: "News",
      isSystem: true,
      isPublic: true,
    },
    {
      name: "Political Commentary",
      description: "Share political opinions with CW",
      category: "politics",
      content: "{opinion}\n\n{context}\n\n#Politics #{topic}",
      defaultCW: "Politics",
      isSystem: true,
      isPublic: true,
    },
    {
      name: "Art Share",
      description: "Share artwork with optional CW for sensitive content",
      category: "art",
      content: "🎨 {title}\n\n{description}\n\n#Art #MastoArt #{medium}",
      defaultCW: "",
      isSystem: true,
      isPublic: true,
    },
    {
      name: "Food Post",
      description: "Share food content with CW for those who prefer it",
      category: "food",
      content: "🍽️ {dish}\n\n{description}\n\n#Food #FoodPorn #{cuisine}",
      defaultCW: "Food",
      isSystem: true,
      isPublic: true,
    },
    {
      name: "Mental Health",
      description: "Discuss mental health topics with appropriate CW",
      category: "health",
      content: "{content}\n\n💙 Remember: You're not alone.\n\n#MentalHealth #{topic}",
      defaultCW: "Mental Health",
      isSystem: true,
      isPublic: true,
    },
    {
      name: "Tech Discussion",
      description: "Share tech news and opinions",
      category: "tech",
      content: "💻 {topic}\n\n{content}\n\n#Tech #{technology}",
      defaultCW: "",
      isSystem: true,
      isPublic: true,
    },
    {
      name: "Gaming Update",
      description: "Share gaming content with spoiler warnings",
      category: "gaming",
      content: "🎮 {game}\n\n{content}\n\n#Gaming #{game}",
      defaultCW: "Gaming",
      isSystem: true,
      isPublic: true,
    },
    {
      name: "Photography",
      description: "Share photos with optional eye contact CW",
      category: "photography",
      content: "📷 {title}\n\n{description}\n\n#Photography #{style}",
      defaultCW: "",
      isSystem: true,
      isPublic: true,
    },
    {
      name: "Personal Update",
      description: "Share personal life updates",
      category: "personal",
      content: "{content}\n\n#{mood}",
      defaultCW: "",
      isSystem: true,
      isPublic: true,
    },
    {
      name: "Opinion Piece",
      description: "Share strong opinions with CW",
      category: "opinion",
      content: "💭 Hot take:\n\n{opinion}\n\n{reasoning}",
      defaultCW: "Opinion",
      isSystem: true,
      isPublic: true,
    },
  ];
  
  for (const template of defaults) {
    await db.insert(mastodonTemplates).values(template);
  }
}


// ============================================
// DIGEST DELIVERY TRACKING OPERATIONS
// ============================================

/**
 * Create a new digest delivery tracking record
 */
export async function createDigestDelivery(data: InsertDigestDeliveryTracking): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(digestDeliveryTracking).values(data);
  return result[0].insertId;
}

/**
 * Get digest delivery by tracking ID
 */
export async function getDigestDeliveryByTrackingId(trackingId: string): Promise<DigestDeliveryTracking | null> {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(digestDeliveryTracking)
    .where(eq(digestDeliveryTracking.trackingId, trackingId))
    .limit(1);
  
  return result[0] || null;
}

/**
 * Record a digest open event
 */
export async function recordDigestOpen(
  trackingId: string, 
  userAgent?: string, 
  ipHash?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const existing = await getDigestDeliveryByTrackingId(trackingId);
  if (!existing) return;
  
  const updates: Partial<InsertDigestDeliveryTracking> = {
    openCount: (existing.openCount || 0) + 1,
    status: "opened",
  };
  
  // Only set openedAt on first open
  if (!existing.openedAt) {
    updates.openedAt = new Date();
  }
  
  if (userAgent) {
    updates.userAgent = userAgent;
  }
  
  if (ipHash) {
    updates.ipHash = ipHash;
  }
  
  await db
    .update(digestDeliveryTracking)
    .set(updates)
    .where(eq(digestDeliveryTracking.trackingId, trackingId));
}

/**
 * Record a digest link click event
 */
export async function recordDigestClick(
  trackingId: string,
  clickedUrl: string,
  section?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const existing = await getDigestDeliveryByTrackingId(trackingId);
  if (!existing) return;
  
  const clickedLinks = existing.clickedLinks || [];
  clickedLinks.push({
    url: clickedUrl,
    clickedAt: Date.now(),
    section,
  });
  
  const updates: Partial<InsertDigestDeliveryTracking> = {
    clickCount: (existing.clickCount || 0) + 1,
    clickedLinks,
    status: "clicked",
  };
  
  // Only set firstClickAt on first click
  if (!existing.firstClickAt) {
    updates.firstClickAt = new Date();
  }
  
  await db
    .update(digestDeliveryTracking)
    .set(updates)
    .where(eq(digestDeliveryTracking.trackingId, trackingId));
}

/**
 * Get digest delivery statistics for a user
 */
export async function getDigestDeliveryStats(userId: number): Promise<{
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  openRate: number;
  clickRate: number;
  recentDeliveries: DigestDeliveryTracking[];
}> {
  const db = await getDb();
  if (!db) {
    return {
      totalSent: 0,
      totalOpened: 0,
      totalClicked: 0,
      openRate: 0,
      clickRate: 0,
      recentDeliveries: [],
    };
  }
  
  const deliveries = await db
    .select()
    .from(digestDeliveryTracking)
    .where(eq(digestDeliveryTracking.userId, userId))
    .orderBy(desc(digestDeliveryTracking.sentAt));
  
  const totalSent = deliveries.length;
  const totalOpened = deliveries.filter(d => d.openedAt !== null).length;
  const totalClicked = deliveries.filter(d => d.firstClickAt !== null).length;
  
  return {
    totalSent,
    totalOpened,
    totalClicked,
    openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
    clickRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
    recentDeliveries: deliveries.slice(0, 10),
  };
}

/**
 * Get all digest deliveries for a user with pagination
 */
export async function getDigestDeliveries(
  userId: number,
  limit: number = 20,
  offset: number = 0
): Promise<DigestDeliveryTracking[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(digestDeliveryTracking)
    .where(eq(digestDeliveryTracking.userId, userId))
    .orderBy(desc(digestDeliveryTracking.sentAt))
    .limit(limit)
    .offset(offset);
}


// ============================================
// TEMPLATE CATEGORIES OPERATIONS
// ============================================

/**
 * Get all template categories for a user
 */
export async function getUserTemplateCategories(userId: number): Promise<TemplateCategory[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(templateCategories)
    .where(eq(templateCategories.userId, userId))
    .orderBy(asc(templateCategories.sortOrder), asc(templateCategories.name));
}

/**
 * Get a single template category by ID
 */
export async function getTemplateCategory(id: number, userId: number): Promise<TemplateCategory | null> {
  const db = await getDb();
  if (!db) return null;
  
  const results = await db
    .select()
    .from(templateCategories)
    .where(and(
      eq(templateCategories.id, id),
      eq(templateCategories.userId, userId)
    ))
    .limit(1);
  
  return results[0] || null;
}

/**
 * Create a new template category
 */
export async function createTemplateCategory(
  data: Omit<InsertTemplateCategory, "id" | "createdAt" | "updatedAt">
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(templateCategories).values(data);
  return result[0].insertId;
}

/**
 * Update a template category
 */
export async function updateTemplateCategory(
  id: number,
  userId: number,
  data: Partial<Omit<InsertTemplateCategory, "id" | "userId" | "createdAt" | "updatedAt">>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db
    .update(templateCategories)
    .set(data)
    .where(and(
      eq(templateCategories.id, id),
      eq(templateCategories.userId, userId)
    ));
}

/**
 * Delete a template category
 */
export async function deleteTemplateCategory(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db
    .delete(templateCategories)
    .where(and(
      eq(templateCategories.id, id),
      eq(templateCategories.userId, userId)
    ));
}

/**
 * Update template count for a category
 */
export async function updateCategoryTemplateCount(categoryId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  // Count templates with this category name
  const category = await getTemplateCategory(categoryId, userId);
  if (!category) return;
  
  const templates = await db
    .select({ count: sql<number>`count(*)` })
    .from(mastodonTemplates)
    .where(and(
      eq(mastodonTemplates.userId, userId),
      sql`${mastodonTemplates.category} = ${category.name}`
    ));
  
  const count = templates[0]?.count || 0;
  
  await db
    .update(templateCategories)
    .set({ templateCount: count })
    .where(eq(templateCategories.id, categoryId));
}

// ============================================
// DIGEST PAUSE/RESUME OPERATIONS
// ============================================

/**
 * Pause digest emails for a user
 */
export async function pauseDigestEmails(
  userId: number,
  reason?: string,
  pauseUntil?: Date
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db
    .update(emailDigestPreferences)
    .set({
      isPaused: true,
      pausedAt: new Date(),
      pauseReason: reason || null,
      pauseUntil: pauseUntil || null,
    })
    .where(eq(emailDigestPreferences.userId, userId));
}

/**
 * Resume digest emails for a user
 */
export async function resumeDigestEmails(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db
    .update(emailDigestPreferences)
    .set({
      isPaused: false,
      pausedAt: null,
      pauseReason: null,
      pauseUntil: null,
    })
    .where(eq(emailDigestPreferences.userId, userId));
}

/**
 * Check if digest is paused and auto-resume if pause period has expired
 */
export async function checkAndAutoResumeDigest(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const results = await db
    .select()
    .from(emailDigestPreferences)
    .where(eq(emailDigestPreferences.userId, userId))
    .limit(1);
  
  const prefs = results[0];
  if (!prefs || !prefs.isPaused) return false;
  
  // Check if pause period has expired
  if (prefs.pauseUntil && new Date(prefs.pauseUntil) <= new Date()) {
    await resumeDigestEmails(userId);
    return true; // Was paused, now resumed
  }
  
  return false; // Still paused
}

/**
 * Get digest pause status
 */
export async function getDigestPauseStatus(userId: number): Promise<{
  isPaused: boolean;
  pausedAt: Date | null;
  pauseReason: string | null;
  pauseUntil: Date | null;
}> {
  const db = await getDb();
  if (!db) {
    return {
      isPaused: false,
      pausedAt: null,
      pauseReason: null,
      pauseUntil: null,
    };
  }
  
  const results = await db
    .select()
    .from(emailDigestPreferences)
    .where(eq(emailDigestPreferences.userId, userId))
    .limit(1);
  
  const prefs = results[0];
  
  return {
    isPaused: prefs?.isPaused ?? false,
    pausedAt: prefs?.pausedAt ?? null,
    pauseReason: prefs?.pauseReason ?? null,
    pauseUntil: prefs?.pauseUntil ?? null,
  };
}


/**
 * Reorder template categories
 */
export async function reorderTemplateCategories(
  userId: number,
  categoryIds: number[]
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  // Update each category with its new sort order
  for (let i = 0; i < categoryIds.length; i++) {
    await db
      .update(templateCategories)
      .set({ sortOrder: i })
      .where(
        and(
          eq(templateCategories.id, categoryIds[i]),
          eq(templateCategories.userId, userId)
        )
      );
  }
}


// ============================================
// A/B TEST TEMPLATES
// ============================================

/**
 * Get all A/B test templates (system + user's custom)
 */
export async function getABTestTemplates(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(abTestTemplates)
    .where(
      or(
        eq(abTestTemplates.isSystem, true),
        eq(abTestTemplates.userId, userId)
      )
    )
    .orderBy(desc(abTestTemplates.usageCount));
}

/**
 * Get a single A/B test template by ID
 */
export async function getABTestTemplate(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const [template] = await db
    .select()
    .from(abTestTemplates)
    .where(
      and(
        eq(abTestTemplates.id, id),
        or(
          eq(abTestTemplates.isSystem, true),
          eq(abTestTemplates.userId, userId)
        )
      )
    );
  
  return template || null;
}

/**
 * Create a custom A/B test template
 */
export async function createABTestTemplate(
  userId: number,
  data: {
    name: string;
    description?: string;
    category: string;
    variantATemplate: string;
    variantALabel?: string;
    variantBTemplate: string;
    variantBLabel?: string;
    platforms?: string[];
    exampleUseCase?: string;
    tags?: string[];
  }
) {
  const db = await getDb();
  if (!db) return null;
  
  const [result] = await db.insert(abTestTemplates).values({
    userId,
    name: data.name,
    description: data.description,
    category: data.category,
    variantATemplate: data.variantATemplate,
    variantALabel: data.variantALabel || "Variant A",
    variantBTemplate: data.variantBTemplate,
    variantBLabel: data.variantBLabel || "Variant B",
    platforms: data.platforms,
    exampleUseCase: data.exampleUseCase,
    tags: data.tags,
    isSystem: false,
  });
  
  return result.insertId;
}

/**
 * Update a custom A/B test template
 */
export async function updateABTestTemplate(
  id: number,
  userId: number,
  data: Partial<{
    name: string;
    description: string;
    category: string;
    variantATemplate: string;
    variantALabel: string;
    variantBTemplate: string;
    variantBLabel: string;
    platforms: string[];
    exampleUseCase: string;
    tags: string[];
  }>
) {
  const db = await getDb();
  if (!db) return false;
  
  await db
    .update(abTestTemplates)
    .set(data)
    .where(
      and(
        eq(abTestTemplates.id, id),
        eq(abTestTemplates.userId, userId),
        eq(abTestTemplates.isSystem, false) // Can't edit system templates
      )
    );
  
  return true;
}

/**
 * Delete a custom A/B test template
 */
export async function deleteABTestTemplate(id: number, userId: number) {
  const db = await getDb();
  if (!db) return false;
  
  await db
    .delete(abTestTemplates)
    .where(
      and(
        eq(abTestTemplates.id, id),
        eq(abTestTemplates.userId, userId),
        eq(abTestTemplates.isSystem, false) // Can't delete system templates
      )
    );
  
  return true;
}

/**
 * Increment usage count for an A/B test template
 */
export async function incrementABTestTemplateUsage(id: number) {
  const db = await getDb();
  if (!db) return;
  
  await db
    .update(abTestTemplates)
    .set({ usageCount: sql`${abTestTemplates.usageCount} + 1` })
    .where(eq(abTestTemplates.id, id));
}

/**
 * Seed system A/B test templates (run once during setup)
 */
export async function seedSystemABTestTemplates() {
  const db = await getDb();
  if (!db) return;
  
  const systemTemplates = [
    {
      name: "Question vs Statement Headline",
      description: "Test whether a question or statement headline drives more engagement",
      category: "headline",
      variantATemplate: "How to [achieve goal] in [timeframe]",
      variantALabel: "Question",
      variantBTemplate: "[Number] Ways to [achieve goal] Fast",
      variantBLabel: "Statement",
      exampleUseCase: "Blog post promotion, thought leadership content",
      tags: ["headline", "engagement", "copywriting"],
      isSystem: true,
    },
    {
      name: "Short vs Long Form",
      description: "Compare concise posts against detailed explanations",
      category: "length",
      variantATemplate: "[Key insight in 1-2 sentences]",
      variantALabel: "Short (< 100 chars)",
      variantBTemplate: "[Detailed explanation with context, examples, and call-to-action spanning 3-4 paragraphs]",
      variantBLabel: "Long (300+ chars)",
      exampleUseCase: "Finding optimal post length for your audience",
      tags: ["length", "format", "engagement"],
      isSystem: true,
    },
    {
      name: "Emoji vs No Emoji",
      description: "Test whether emojis increase or decrease engagement",
      category: "formatting",
      variantATemplate: "🚀 [Your message] 💡",
      variantALabel: "With Emojis",
      variantBTemplate: "[Your message - no emojis]",
      variantBLabel: "No Emojis",
      exampleUseCase: "Determining if your audience responds to emojis",
      tags: ["emoji", "formatting", "tone"],
      isSystem: true,
    },
    {
      name: "Personal Story vs Data-Driven",
      description: "Compare storytelling approach against statistics-based content",
      category: "tone",
      variantATemplate: "When I first [personal experience]... Here's what I learned:",
      variantALabel: "Personal Story",
      variantBTemplate: "According to [source], [statistic]. Here's what this means:",
      variantBLabel: "Data-Driven",
      exampleUseCase: "Testing emotional vs logical appeal",
      tags: ["storytelling", "data", "tone"],
      isSystem: true,
    },
    {
      name: "Direct CTA vs Soft CTA",
      description: "Test strong call-to-action against subtle invitation",
      category: "cta",
      variantATemplate: "[Content] → Click the link to [action] NOW!",
      variantALabel: "Direct CTA",
      variantBTemplate: "[Content] If this resonates, you might enjoy [resource]",
      variantBLabel: "Soft CTA",
      exampleUseCase: "Optimizing conversion without being pushy",
      tags: ["cta", "conversion", "engagement"],
      isSystem: true,
    },
    {
      name: "List Format vs Paragraph",
      description: "Compare bullet point lists against flowing paragraphs",
      category: "formatting",
      variantATemplate: "Key takeaways:\\n• Point 1\\n• Point 2\\n• Point 3",
      variantALabel: "List Format",
      variantBTemplate: "Here's the thing about [topic]. First, [point 1]. Additionally, [point 2]. Finally, [point 3].",
      variantBLabel: "Paragraph",
      exampleUseCase: "Testing readability and scan-ability",
      tags: ["formatting", "readability", "structure"],
      isSystem: true,
    },
    {
      name: "Controversial vs Safe Take",
      description: "Test bold opinions against conventional wisdom",
      category: "tone",
      variantATemplate: "Unpopular opinion: [controversial stance]",
      variantALabel: "Controversial",
      variantBTemplate: "Here's a reminder: [widely accepted advice]",
      variantBLabel: "Safe Take",
      exampleUseCase: "Finding the right balance of boldness",
      tags: ["controversy", "opinion", "engagement"],
      isSystem: true,
    },
    {
      name: "Hashtag Heavy vs Minimal",
      description: "Compare posts with many hashtags against few or none",
      category: "hashtags",
      variantATemplate: "[Content] #topic1 #topic2 #topic3 #topic4 #topic5",
      variantALabel: "5+ Hashtags",
      variantBTemplate: "[Content] #maintopic",
      variantBLabel: "1 Hashtag",
      exampleUseCase: "Optimizing discoverability vs aesthetics",
      tags: ["hashtags", "reach", "discovery"],
      isSystem: true,
    },
  ];
  
  // Check if system templates already exist
  const existing = await db
    .select({ id: abTestTemplates.id })
    .from(abTestTemplates)
    .where(eq(abTestTemplates.isSystem, true))
    .limit(1);
  
  if (existing.length === 0) {
    for (const template of systemTemplates) {
      await db.insert(abTestTemplates).values(template);
    }
  }
}


// ============================================
// DIGEST A/B TEST FUNCTIONS
// ============================================

/**
 * Create a new digest A/B test
 */
export async function createDigestABTest(
  userId: number,
  data: {
    name: string;
    variantAName?: string;
    variantASubjectLine?: string;
    variantASectionOrder?: string[];
    variantAIncludeSections?: Record<string, boolean>;
    variantBName?: string;
    variantBSubjectLine?: string;
    variantBSectionOrder?: string[];
    variantBIncludeSections?: Record<string, boolean>;
    testDuration?: number;
  }
): Promise<DigestABTest | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [result] = await db.insert(digestABTests).values({
    userId,
    name: data.name,
    variantAName: data.variantAName || "Variant A",
    variantASubjectLine: data.variantASubjectLine,
    variantASectionOrder: data.variantASectionOrder,
    variantAIncludeSections: data.variantAIncludeSections,
    variantBName: data.variantBName || "Variant B",
    variantBSubjectLine: data.variantBSubjectLine,
    variantBSectionOrder: data.variantBSectionOrder,
    variantBIncludeSections: data.variantBIncludeSections,
    testDuration: data.testDuration || 4,
    status: "draft",
  });
  
  const [test] = await db
    .select()
    .from(digestABTests)
    .where(eq(digestABTests.id, (result as any).insertId))
    .limit(1);
  
  return test || null;
}

/**
 * Get all digest A/B tests for a user
 */
export async function getDigestABTests(userId: number): Promise<DigestABTest[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(digestABTests)
    .where(eq(digestABTests.userId, userId))
    .orderBy(desc(digestABTests.createdAt));
}

/**
 * Get a single digest A/B test by ID
 */
export async function getDigestABTest(id: number, userId: number): Promise<DigestABTest | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [test] = await db
    .select()
    .from(digestABTests)
    .where(and(eq(digestABTests.id, id), eq(digestABTests.userId, userId)))
    .limit(1);
  
  return test || null;
}

/**
 * Get the currently running digest A/B test for a user
 */
export async function getRunningDigestABTest(userId: number): Promise<DigestABTest | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [test] = await db
    .select()
    .from(digestABTests)
    .where(and(eq(digestABTests.userId, userId), eq(digestABTests.status, "running")))
    .limit(1);
  
  return test || null;
}

/**
 * Start a digest A/B test
 */
export async function startDigestABTest(id: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  // First check if there's already a running test
  const running = await getRunningDigestABTest(userId);
  if (running) return false;
  
  await db
    .update(digestABTests)
    .set({ status: "running", startedAt: new Date() })
    .where(and(eq(digestABTests.id, id), eq(digestABTests.userId, userId)));
  
  return true;
}

/**
 * Record a digest send for an A/B test
 */
export async function recordDigestABTestSend(
  id: number,
  variant: "A" | "B"
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  if (variant === "A") {
    await db
      .update(digestABTests)
      .set({ variantASent: sql`${digestABTests.variantASent} + 1` })
      .where(eq(digestABTests.id, id));
  } else {
    await db
      .update(digestABTests)
      .set({ variantBSent: sql`${digestABTests.variantBSent} + 1` })
      .where(eq(digestABTests.id, id));
  }
}

/**
 * Record a digest open for an A/B test
 */
export async function recordDigestABTestOpen(
  id: number,
  variant: "A" | "B"
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  if (variant === "A") {
    await db
      .update(digestABTests)
      .set({ variantAOpened: sql`${digestABTests.variantAOpened} + 1` })
      .where(eq(digestABTests.id, id));
  } else {
    await db
      .update(digestABTests)
      .set({ variantBOpened: sql`${digestABTests.variantBOpened} + 1` })
      .where(eq(digestABTests.id, id));
  }
}

/**
 * Record a digest click for an A/B test
 */
export async function recordDigestABTestClick(
  id: number,
  variant: "A" | "B"
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  if (variant === "A") {
    await db
      .update(digestABTests)
      .set({ variantAClicked: sql`${digestABTests.variantAClicked} + 1` })
      .where(eq(digestABTests.id, id));
  } else {
    await db
      .update(digestABTests)
      .set({ variantBClicked: sql`${digestABTests.variantBClicked} + 1` })
      .where(eq(digestABTests.id, id));
  }
}

/**
 * Complete a digest A/B test and determine winner
 */
export async function completeDigestABTest(
  id: number,
  userId: number
): Promise<{ winner: "A" | "B" | "tie"; reason: string } | null> {
  const db = await getDb();
  if (!db) return null;
  
  const test = await getDigestABTest(id, userId);
  if (!test) return null;
  
  // Calculate open rates
  const openRateA = test.variantASent ? ((test.variantAOpened || 0) / test.variantASent) * 100 : 0;
  const openRateB = test.variantBSent ? ((test.variantBOpened || 0) / test.variantBSent) * 100 : 0;
  
  // Calculate click rates
  const clickRateA = test.variantASent ? ((test.variantAClicked || 0) / test.variantASent) * 100 : 0;
  const clickRateB = test.variantBSent ? ((test.variantBClicked || 0) / test.variantBSent) * 100 : 0;
  
  // Determine winner based on combined score (open rate + click rate)
  const scoreA = openRateA + clickRateA * 2; // Weight clicks more
  const scoreB = openRateB + clickRateB * 2;
  
  let winner: "A" | "B" | "tie" = "tie";
  let reason = "";
  
  if (Math.abs(scoreA - scoreB) < 1) {
    winner = "tie";
    reason = `Results too close to determine a clear winner. Variant A: ${openRateA.toFixed(1)}% open, ${clickRateA.toFixed(1)}% click. Variant B: ${openRateB.toFixed(1)}% open, ${clickRateB.toFixed(1)}% click.`;
  } else if (scoreA > scoreB) {
    winner = "A";
    reason = `Variant A performed better with ${openRateA.toFixed(1)}% open rate and ${clickRateA.toFixed(1)}% click rate vs Variant B's ${openRateB.toFixed(1)}% open and ${clickRateB.toFixed(1)}% click.`;
  } else {
    winner = "B";
    reason = `Variant B performed better with ${openRateB.toFixed(1)}% open rate and ${clickRateB.toFixed(1)}% click rate vs Variant A's ${openRateA.toFixed(1)}% open and ${clickRateA.toFixed(1)}% click.`;
  }
  
  await db
    .update(digestABTests)
    .set({
      status: "completed",
      completedAt: new Date(),
      winningVariant: winner === "tie" ? null : winner,
      winningReason: reason,
    })
    .where(and(eq(digestABTests.id, id), eq(digestABTests.userId, userId)));
  
  return { winner, reason };
}

/**
 * Delete a digest A/B test
 */
export async function deleteDigestABTest(id: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  await db
    .delete(digestABTests)
    .where(and(eq(digestABTests.id, id), eq(digestABTests.userId, userId)));
  
  return true;
}


// ==========================================
// Template Sharing Functions
// ==========================================

/**
 * Get all publicly shared A/B test templates
 */
export async function getSharedABTestTemplates(options?: {
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<ABTestTemplate[]> {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [
    eq(abTestTemplates.isPublic, true),
    eq(abTestTemplates.isSystem, false),
  ];
  
  if (options?.category) {
    conditions.push(eq(abTestTemplates.category, options.category));
  }
  
  let query = db
    .select()
    .from(abTestTemplates)
    .where(and(...conditions))
    .orderBy(desc(abTestTemplates.shareCount), desc(abTestTemplates.createdAt));
  
  if (options?.limit) {
    query = query.limit(options.limit) as typeof query;
  }
  if (options?.offset) {
    query = query.offset(options.offset) as typeof query;
  }
  
  const results = await query;
  
  // Filter by search if provided
  if (options?.search) {
    const searchLower = options.search.toLowerCase();
    return results.filter(t => 
      t.name.toLowerCase().includes(searchLower) ||
      t.description?.toLowerCase().includes(searchLower) ||
      t.tags?.some((tag: string) => tag.toLowerCase().includes(searchLower))
    );
  }
  
  return results;
}

/**
 * Share a template publicly
 */
export async function shareABTestTemplate(
  templateId: number,
  userId: number,
  creatorName: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  // Verify ownership
  const [template] = await db
    .select()
    .from(abTestTemplates)
    .where(and(
      eq(abTestTemplates.id, templateId),
      eq(abTestTemplates.userId, userId),
      eq(abTestTemplates.isSystem, false)
    ))
    .limit(1);
  
  if (!template) return false;
  
  await db
    .update(abTestTemplates)
    .set({ isPublic: true, creatorName })
    .where(eq(abTestTemplates.id, templateId));
  
  return true;
}

/**
 * Unshare a template (make it private)
 */
export async function unshareABTestTemplate(
  templateId: number,
  userId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  await db
    .update(abTestTemplates)
    .set({ isPublic: false })
    .where(and(
      eq(abTestTemplates.id, templateId),
      eq(abTestTemplates.userId, userId)
    ));
  
  return true;
}

/**
 * Copy a shared template to user's templates
 */
export async function copySharedABTestTemplate(
  templateId: number,
  userId: number
): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  
  // Get the original template
  const [original] = await db
    .select()
    .from(abTestTemplates)
    .where(and(
      eq(abTestTemplates.id, templateId),
      eq(abTestTemplates.isPublic, true)
    ))
    .limit(1);
  
  if (!original) return null;
  
  // Create a copy for the user
  const result = await db.insert(abTestTemplates).values({
    name: `${original.name} (Copy)`,
    description: original.description,
    category: original.category,
    isSystem: false,
    userId,
    platforms: original.platforms,
    variantATemplate: original.variantATemplate,
    variantALabel: original.variantALabel,
    variantBTemplate: original.variantBTemplate,
    variantBLabel: original.variantBLabel,
    exampleUseCase: original.exampleUseCase,
    tags: original.tags,
    usageCount: 0,
    isPublic: false,
    shareCount: 0,
    copiedFromId: original.id,
    creatorName: original.creatorName,
  });
  
  // Increment share count on original
  await db
    .update(abTestTemplates)
    .set({ shareCount: sql`${abTestTemplates.shareCount} + 1` })
    .where(eq(abTestTemplates.id, templateId));
  
  const insertId = (result as any)[0]?.insertId;
  return insertId || null;
}

/**
 * Get template sharing stats for a user
 */
export async function getTemplateSharingStats(userId: number): Promise<{
  totalShared: number;
  totalCopies: number;
  topTemplates: { id: number; name: string; shareCount: number }[];
}> {
  const db = await getDb();
  if (!db) return { totalShared: 0, totalCopies: 0, topTemplates: [] };
  
  const sharedTemplates = await db
    .select()
    .from(abTestTemplates)
    .where(and(
      eq(abTestTemplates.userId, userId),
      eq(abTestTemplates.isPublic, true)
    ))
    .orderBy(desc(abTestTemplates.shareCount));
  
  const totalShared = sharedTemplates.length;
  const totalCopies = sharedTemplates.reduce((sum, t) => sum + (t.shareCount || 0), 0);
  const topTemplates = sharedTemplates.slice(0, 5).map(t => ({
    id: t.id,
    name: t.name,
    shareCount: t.shareCount || 0,
  }));
  
  return { totalShared, totalCopies, topTemplates };
}


// ==========================================
// Template Ratings Functions
// ==========================================

/**
 * Rate a template
 */
export async function rateTemplate(
  templateId: number,
  userId: number,
  rating: number,
  review?: string
): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  
  // Check if user already rated this template
  const [existing] = await db
    .select()
    .from(templateRatings)
    .where(and(
      eq(templateRatings.templateId, templateId),
      eq(templateRatings.userId, userId)
    ))
    .limit(1);
  
  if (existing) {
    // Update existing rating
    await db
      .update(templateRatings)
      .set({ rating, review })
      .where(eq(templateRatings.id, existing.id));
    return existing.id;
  }
  
  // Create new rating
  const result = await db.insert(templateRatings).values({
    templateId,
    userId,
    rating,
    review,
  });
  
  const insertId = (result as any)[0]?.insertId;
  return insertId || null;
}

/**
 * Get ratings for a template
 */
export async function getTemplateRatings(templateId: number): Promise<{
  averageRating: number;
  totalRatings: number;
  ratings: TemplateRating[];
}> {
  const db = await getDb();
  if (!db) return { averageRating: 0, totalRatings: 0, ratings: [] };
  
  const ratings = await db
    .select()
    .from(templateRatings)
    .where(eq(templateRatings.templateId, templateId))
    .orderBy(desc(templateRatings.createdAt));
  
  const totalRatings = ratings.length;
  const averageRating = totalRatings > 0
    ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
    : 0;
  
  return { averageRating, totalRatings, ratings };
}

/**
 * Get user's rating for a template
 */
export async function getUserTemplateRating(
  templateId: number,
  userId: number
): Promise<TemplateRating | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [rating] = await db
    .select()
    .from(templateRatings)
    .where(and(
      eq(templateRatings.templateId, templateId),
      eq(templateRatings.userId, userId)
    ))
    .limit(1);
  
  return rating || null;
}

/**
 * Get top rated templates
 */
export async function getTopRatedTemplates(limit: number = 10): Promise<{
  template: ABTestTemplate;
  averageRating: number;
  totalRatings: number;
}[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Get all public templates
  const templates = await db
    .select()
    .from(abTestTemplates)
    .where(eq(abTestTemplates.isPublic, true));
  
  // Get ratings for each template
  const templatesWithRatings = await Promise.all(
    templates.map(async (template) => {
      const { averageRating, totalRatings } = await getTemplateRatings(template.id);
      return { template, averageRating, totalRatings };
    })
  );
  
  // Sort by average rating (with at least 1 rating)
  return templatesWithRatings
    .filter(t => t.totalRatings > 0)
    .sort((a, b) => b.averageRating - a.averageRating)
    .slice(0, limit);
}


// ==========================================
// Digest A/B Test Scheduling Functions
// ==========================================

/**
 * Schedule a digest A/B test to start at a specific time
 */
export async function scheduleDigestABTest(
  id: number,
  userId: number,
  scheduledStartAt: Date
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  await db
    .update(digestABTests)
    .set({
      scheduledStartAt,
      autoStartEnabled: true,
    })
    .where(and(eq(digestABTests.id, id), eq(digestABTests.userId, userId)));
  
  return true;
}

/**
 * Cancel a scheduled digest A/B test
 */
export async function cancelScheduledDigestABTest(
  id: number,
  userId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  await db
    .update(digestABTests)
    .set({
      scheduledStartAt: null,
      autoStartEnabled: false,
    })
    .where(and(eq(digestABTests.id, id), eq(digestABTests.userId, userId)));
  
  return true;
}

/**
 * Get scheduled digest A/B tests that should be started
 */
export async function getScheduledDigestABTestsToStart(): Promise<DigestABTest[]> {
  const db = await getDb();
  if (!db) return [];
  
  const now = new Date();
  
  return db
    .select()
    .from(digestABTests)
    .where(and(
      eq(digestABTests.status, "draft"),
      eq(digestABTests.autoStartEnabled, true),
      lte(digestABTests.scheduledStartAt, now)
    ));
}


// ==========================================
// Template Version History Functions
// ==========================================

/**
 * Create a version snapshot of a template
 */
export async function createTemplateVersion(
  templateId: number,
  userId: number,
  changeNote?: string
): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  
  // Get the current template
  const [template] = await db
    .select()
    .from(abTestTemplates)
    .where(eq(abTestTemplates.id, templateId))
    .limit(1);
  
  if (!template) return null;
  
  // Get the next version number
  const versions = await db
    .select()
    .from(templateVersions)
    .where(eq(templateVersions.templateId, templateId))
    .orderBy(desc(templateVersions.versionNumber))
    .limit(1);
  
  const nextVersion = versions.length > 0 ? versions[0].versionNumber + 1 : 1;
  
  // Create the version snapshot
  const result = await db.insert(templateVersions).values({
    templateId,
    versionNumber: nextVersion,
    name: template.name,
    description: template.description,
    category: template.category,
    variantATemplate: template.variantATemplate,
    variantBTemplate: template.variantBTemplate,
    variantALabel: template.variantALabel,
    variantBLabel: template.variantBLabel,
    tags: template.tags,
    changeNote,
    changedBy: userId,
  });
  
  const insertId = (result as any)[0]?.insertId;
  return insertId || null;
}

/**
 * Get version history for a template
 */
export async function getTemplateVersionHistory(
  templateId: number
): Promise<TemplateVersion[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(templateVersions)
    .where(eq(templateVersions.templateId, templateId))
    .orderBy(desc(templateVersions.versionNumber));
}

/**
 * Revert a template to a previous version
 */
export async function revertTemplateToVersion(
  templateId: number,
  versionId: number,
  userId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  // Get the version to revert to
  const [version] = await db
    .select()
    .from(templateVersions)
    .where(and(
      eq(templateVersions.id, versionId),
      eq(templateVersions.templateId, templateId)
    ))
    .limit(1);
  
  if (!version) return false;
  
  // Create a snapshot of current state before reverting
  await createTemplateVersion(templateId, userId, `Before revert to version ${version.versionNumber}`);
  
  // Update the template with the version data
  await db
    .update(abTestTemplates)
    .set({
      name: version.name,
      description: version.description,
      category: version.category,
      variantATemplate: version.variantATemplate,
      variantBTemplate: version.variantBTemplate,
      variantALabel: version.variantALabel,
      variantBLabel: version.variantBLabel,
      tags: version.tags,
    })
    .where(eq(abTestTemplates.id, templateId));
  
  // Create a new version entry for the revert
  await createTemplateVersion(templateId, userId, `Reverted to version ${version.versionNumber}`);
  
  return true;
}

/**
 * Get a specific template version
 */
export async function getTemplateVersion(
  versionId: number
): Promise<TemplateVersion | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [version] = await db
    .select()
    .from(templateVersions)
    .where(eq(templateVersions.id, versionId))
    .limit(1);
  
  return version || null;
}


// ==========================================
// Template Import/Export Functions
// ==========================================

export interface ExportedTemplate {
  name: string;
  description: string | null;
  category: string;
  variantATemplate: string;
  variantBTemplate: string;
  variantALabel: string | null;
  variantBLabel: string | null;
  tags: string[] | null;
  exportedAt: string;
  version: string;
}

/**
 * Export a template to JSON format
 */
export async function exportTemplate(
  templateId: number,
  userId: number
): Promise<ExportedTemplate | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [template] = await db
    .select()
    .from(abTestTemplates)
    .where(and(
      eq(abTestTemplates.id, templateId),
      or(
        eq(abTestTemplates.userId, userId),
        eq(abTestTemplates.isPublic, true),
        eq(abTestTemplates.isSystem, true)
      )
    ))
    .limit(1);
  
  if (!template) return null;
  
  return {
    name: template.name,
    description: template.description,
    category: template.category,
    variantATemplate: template.variantATemplate,
    variantBTemplate: template.variantBTemplate,
    variantALabel: template.variantALabel,
    variantBLabel: template.variantBLabel,
    tags: template.tags,
    exportedAt: new Date().toISOString(),
    version: "1.0"
  };
}

/**
 * Import a template from JSON format
 */
export async function importTemplate(
  userId: number,
  data: ExportedTemplate,
  newName?: string
): Promise<ABTestTemplate | null> {
  const db = await getDb();
  if (!db) return null;
  
  // Validate required fields
  if (!data.name || !data.category || !data.variantATemplate || !data.variantBTemplate) {
    return null;
  }
  
  // Check for duplicate name
  const existingTemplates = await db
    .select()
    .from(abTestTemplates)
    .where(and(
      eq(abTestTemplates.userId, userId),
      eq(abTestTemplates.name, newName || data.name)
    ))
    .limit(1);
  
  const finalName = existingTemplates.length > 0 
    ? `${newName || data.name} (Imported ${new Date().toLocaleDateString()})`
    : (newName || data.name);
  
  const result = await db
    .insert(abTestTemplates)
    .values({
      userId,
      name: finalName,
      description: data.description,
      category: data.category,
      variantATemplate: data.variantATemplate,
      variantBTemplate: data.variantBTemplate,
      variantALabel: data.variantALabel,
      variantBLabel: data.variantBLabel,
      tags: data.tags,
      isSystem: false,
      isPublic: false,
    });
  
  const insertId = Number((result as any)[0]?.insertId || (result as any).insertId);
  if (!insertId) return null;
  
  const [newTemplate] = await db
    .select()
    .from(abTestTemplates)
    .where(eq(abTestTemplates.id, insertId))
    .limit(1);
  
  return newTemplate || null;
}

/**
 * Export multiple templates at once
 */
export async function exportMultipleTemplates(
  templateIds: number[],
  userId: number
): Promise<ExportedTemplate[]> {
  const templates: ExportedTemplate[] = [];
  
  for (const id of templateIds) {
    const template = await exportTemplate(id, userId);
    if (template) {
      templates.push(template);
    }
  }
  
  return templates;
}

/**
 * Import multiple templates at once
 */
export async function importMultipleTemplates(
  userId: number,
  templates: ExportedTemplate[]
): Promise<{ imported: number; failed: number; templates: ABTestTemplate[] }> {
  const results: ABTestTemplate[] = [];
  let failed = 0;
  
  for (const data of templates) {
    const template = await importTemplate(userId, data);
    if (template) {
      results.push(template);
    } else {
      failed++;
    }
  }
  
  return {
    imported: results.length,
    failed,
    templates: results
  };
}


// ==========================================
// Digest A/B Test Auto-Complete Functions
// ==========================================

/**
 * Calculate statistical significance for digest A/B test
 * Uses chi-squared test for comparing open rates
 */
export function calculateDigestTestSignificance(
  variantASent: number,
  variantAOpened: number,
  variantBSent: number,
  variantBOpened: number
): { confidence: number; winner: 'A' | 'B' | null; isSignificant: boolean } {
  // Need minimum sample size
  if (variantASent < 10 || variantBSent < 10) {
    return { confidence: 0, winner: null, isSignificant: false };
  }
  
  const rateA = variantAOpened / variantASent;
  const rateB = variantBOpened / variantBSent;
  
  // Pooled rate
  const pooledRate = (variantAOpened + variantBOpened) / (variantASent + variantBSent);
  
  // Standard error
  const se = Math.sqrt(pooledRate * (1 - pooledRate) * (1/variantASent + 1/variantBSent));
  
  if (se === 0) {
    return { confidence: 0, winner: null, isSignificant: false };
  }
  
  // Z-score
  const z = Math.abs(rateA - rateB) / se;
  
  // Convert Z to confidence (approximate)
  // Z=1.645 -> 90%, Z=1.96 -> 95%, Z=2.576 -> 99%
  let confidence = 0;
  if (z >= 2.576) confidence = 99;
  else if (z >= 2.326) confidence = 98;
  else if (z >= 1.96) confidence = 95;
  else if (z >= 1.645) confidence = 90;
  else if (z >= 1.282) confidence = 80;
  else confidence = Math.round(z * 30); // Rough approximation for lower values
  
  const winner = rateA > rateB ? 'A' : rateB > rateA ? 'B' : null;
  const isSignificant = confidence >= 95;
  
  return { confidence, winner, isSignificant };
}

/**
 * Check if a digest A/B test should auto-complete
 */
export async function checkDigestTestAutoComplete(
  testId: number
): Promise<{ shouldComplete: boolean; winner: 'A' | 'B' | null; confidence: number; reason: string }> {
  const db = await getDb();
  if (!db) return { shouldComplete: false, winner: null, confidence: 0, reason: 'Database unavailable' };
  
  const [test] = await db
    .select()
    .from(digestABTests)
    .where(eq(digestABTests.id, testId))
    .limit(1);
  
  if (!test) {
    return { shouldComplete: false, winner: null, confidence: 0, reason: 'Test not found' };
  }
  
  if (test.status !== 'running') {
    return { shouldComplete: false, winner: null, confidence: 0, reason: 'Test not running' };
  }
  
  if (!test.autoCompleteEnabled) {
    return { shouldComplete: false, winner: null, confidence: 0, reason: 'Auto-complete disabled' };
  }
  
  const minSampleSize = test.minimumSampleSize || 100;
  const confidenceThreshold = test.confidenceThreshold || 95;
  
  // Check minimum sample size
  if ((test.variantASent || 0) < minSampleSize || (test.variantBSent || 0) < minSampleSize) {
    return { 
      shouldComplete: false, 
      winner: null, 
      confidence: 0, 
      reason: `Minimum sample size not reached (need ${minSampleSize} per variant)` 
    };
  }
  
  // Calculate significance
  const { confidence, winner, isSignificant } = calculateDigestTestSignificance(
    test.variantASent || 0,
    test.variantAOpened || 0,
    test.variantBSent || 0,
    test.variantBOpened || 0
  );
  
  if (confidence >= confidenceThreshold && winner) {
    return { 
      shouldComplete: true, 
      winner, 
      confidence, 
      reason: `Statistical significance reached at ${confidence}% confidence` 
    };
  }
  
  return { 
    shouldComplete: false, 
    winner, 
    confidence, 
    reason: `Confidence ${confidence}% below threshold ${confidenceThreshold}%` 
  };
}

/**
 * Auto-complete a digest A/B test
 */
export async function autoCompleteDigestTest(
  testId: number
): Promise<{ success: boolean; winner: 'A' | 'B' | null; reason: string; notificationSent?: boolean }> {
  const db = await getDb();
  if (!db) return { success: false, winner: null, reason: 'Database unavailable' };
  
  const checkResult = await checkDigestTestAutoComplete(testId);
  
  if (!checkResult.shouldComplete) {
    return { success: false, winner: null, reason: checkResult.reason };
  }
  
  // Get test details for notification
  const [test] = await db
    .select()
    .from(digestABTests)
    .where(eq(digestABTests.id, testId))
    .limit(1);
  
  // Complete the test
  await db
    .update(digestABTests)
    .set({
      status: 'completed',
      winningVariant: checkResult.winner,
      winningReason: checkResult.reason,
      completedAt: new Date(),
      autoCompletedAt: new Date(),
    })
    .where(eq(digestABTests.id, testId));
  
  // Send notification
  let notificationSent = false;
  if (test && checkResult.winner) {
    const variantAOpenRate = (test.variantASent || 0) > 0 
      ? ((test.variantAOpened || 0) / (test.variantASent || 1)) * 100 
      : 0;
    const variantBOpenRate = (test.variantBSent || 0) > 0 
      ? ((test.variantBOpened || 0) / (test.variantBSent || 1)) * 100 
      : 0;
    
    notificationSent = await notifyDigestTestAutoComplete(
      test.name,
      checkResult.winner,
      checkResult.confidence,
      test.variantAName || 'Variant A',
      test.variantBName || 'Variant B',
      variantAOpenRate,
      variantBOpenRate
    );
  }
  
  return { 
    success: true, 
    winner: checkResult.winner, 
    reason: checkResult.reason,
    notificationSent
  };
}

/**
 * Update auto-complete settings for a digest A/B test
 */
export async function updateDigestTestAutoCompleteSettings(
  testId: number,
  userId: number,
  settings: {
    autoCompleteEnabled?: boolean;
    minimumSampleSize?: number;
    confidenceThreshold?: number;
  }
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  await db
    .update(digestABTests)
    .set(settings)
    .where(and(eq(digestABTests.id, testId), eq(digestABTests.userId, userId)));
  
  return true;
}

/**
 * Get all running digest tests that may need auto-completion check
 */
export async function getRunningDigestTestsForAutoComplete(): Promise<DigestABTest[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(digestABTests)
    .where(and(
      eq(digestABTests.status, 'running'),
      eq(digestABTests.autoCompleteEnabled, true)
    ));
}

/**
 * Send notification when a digest test auto-completes
 */
export async function notifyDigestTestAutoComplete(
  testName: string,
  winner: 'A' | 'B',
  confidence: number,
  variantAName: string,
  variantBName: string,
  variantAOpenRate: number,
  variantBOpenRate: number
): Promise<boolean> {
  try {
    const { notifyOwner } = await import('./_core/notification');
    
    const winnerName = winner === 'A' ? variantAName : variantBName;
    const winnerRate = winner === 'A' ? variantAOpenRate : variantBOpenRate;
    const loserRate = winner === 'A' ? variantBOpenRate : variantAOpenRate;
    
    const title = `🎯 Digest A/B Test Auto-Completed: ${testName}`;
    const content = `Your digest A/B test "${testName}" has automatically completed!

**Winner: ${winnerName}** with ${confidence}% statistical confidence.

**Results:**
- ${variantAName}: ${variantAOpenRate.toFixed(1)}% open rate
- ${variantBName}: ${variantBOpenRate.toFixed(1)}% open rate

The winning variant achieved a ${(winnerRate - loserRate).toFixed(1)} percentage point improvement in open rates.

You can view the full results in your Settings > Email Digests > A/B Testing section.`;
    
    return await notifyOwner({ title, content });
  } catch (error) {
    console.error('[Notification] Failed to send digest auto-complete notification:', error);
    return false;
  }
}

/**
 * Process all running digest tests for auto-completion
 */
export async function processDigestTestsAutoComplete(): Promise<{
  processed: number;
  completed: number;
  results: Array<{ testId: number; completed: boolean; winner: string | null; reason: string }>;
}> {
  const tests = await getRunningDigestTestsForAutoComplete();
  const results: Array<{ testId: number; completed: boolean; winner: string | null; reason: string }> = [];
  let completed = 0;
  
  for (const test of tests) {
    const result = await autoCompleteDigestTest(test.id);
    results.push({
      testId: test.id,
      completed: result.success,
      winner: result.winner,
      reason: result.reason,
    });
    if (result.success) completed++;
  }
  
  return { processed: tests.length, completed, results };
}


// ==========================================
// Template Marketplace Functions
// ==========================================

import { templateAnalytics } from "../drizzle/schema";
import type { TemplateAnalytic, InsertTemplateAnalytic } from "../drizzle/schema";

/**
 * Get marketplace templates with filtering and sorting
 */
export async function getMarketplaceTemplates(options: {
  category?: string;
  search?: string;
  sortBy?: 'popular' | 'rating' | 'newest' | 'downloads';
  limit?: number;
  offset?: number;
}): Promise<{
  templates: Array<ABTestTemplate & {
    averageRating: number;
    totalRatings: number;
    downloadCount: number;
  }>;
  total: number;
}> {
  const db = await getDb();
  if (!db) return { templates: [], total: 0 };
  
  const { category, search, sortBy = 'popular', limit = 20, offset = 0 } = options;
  
  // Build base query for public templates
  let query = db
    .select()
    .from(abTestTemplates)
    .where(eq(abTestTemplates.isPublic, true));
  
  // Get all public templates first
  const allTemplates = await query;
  
  // Filter by category
  let filtered = allTemplates;
  if (category && category !== 'all') {
    filtered = filtered.filter(t => t.category === category);
  }
  
  // Filter by search
  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(t => 
      t.name.toLowerCase().includes(searchLower) ||
      (t.description?.toLowerCase().includes(searchLower)) ||
      (t.tags?.some(tag => tag.toLowerCase().includes(searchLower)))
    );
  }
  
  // Get ratings and download counts for each template
  const templatesWithStats = await Promise.all(
    filtered.map(async (template) => {
      const ratings = await getTemplateRatings(template.id);
      
      // Get download count from analytics
      const downloadEvents = await db
        .select({ count: sql<number>`count(*)` })
        .from(templateAnalytics)
        .where(and(
          eq(templateAnalytics.templateId, template.id),
          eq(templateAnalytics.eventType, 'download')
        ));
      
      return {
        ...template,
        averageRating: ratings.averageRating,
        totalRatings: ratings.totalRatings,
        downloadCount: downloadEvents[0]?.count || 0,
      };
    })
  );
  
  // Sort
  let sorted = [...templatesWithStats];
  switch (sortBy) {
    case 'popular':
      sorted.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
      break;
    case 'rating':
      sorted.sort((a, b) => b.averageRating - a.averageRating);
      break;
    case 'newest':
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
    case 'downloads':
      sorted.sort((a, b) => b.downloadCount - a.downloadCount);
      break;
  }
  
  // Paginate
  const total = sorted.length;
  const paginated = sorted.slice(offset, offset + limit);
  
  return { templates: paginated, total };
}

/**
 * Download (copy) a template from marketplace to user's library
 */
export async function downloadMarketplaceTemplate(
  templateId: number,
  userId: number
): Promise<ABTestTemplate | null> {
  const db = await getDb();
  if (!db) return null;
  
  // Get the source template
  const [sourceTemplate] = await db
    .select()
    .from(abTestTemplates)
    .where(and(
      eq(abTestTemplates.id, templateId),
      eq(abTestTemplates.isPublic, true)
    ))
    .limit(1);
  
  if (!sourceTemplate) return null;
  
  // Get user info for attribution
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  // Create a copy for the user
  const [result] = await db.insert(abTestTemplates).values({
    name: sourceTemplate.name,
    description: sourceTemplate.description,
    category: sourceTemplate.category,
    isSystem: false,
    userId,
    platforms: sourceTemplate.platforms,
    variantATemplate: sourceTemplate.variantATemplate,
    variantALabel: sourceTemplate.variantALabel,
    variantBTemplate: sourceTemplate.variantBTemplate,
    variantBLabel: sourceTemplate.variantBLabel,
    exampleUseCase: sourceTemplate.exampleUseCase,
    tags: sourceTemplate.tags,
    usageCount: 0,
    isPublic: false,
    shareCount: 0,
    copiedFromId: sourceTemplate.id,
    creatorName: sourceTemplate.creatorName || (sourceTemplate.userId ? null : 'System'),
  });
  
  // Increment share count on source template
  await db
    .update(abTestTemplates)
    .set({ shareCount: sql`${abTestTemplates.shareCount} + 1` })
    .where(eq(abTestTemplates.id, templateId));
  
  // Track the download event
  await trackTemplateEvent(templateId, 'download', userId, { source: 'marketplace' });
  
  // Return the new template
  const [newTemplate] = await db
    .select()
    .from(abTestTemplates)
    .where(eq(abTestTemplates.id, result.insertId))
    .limit(1);
  
  return newTemplate || null;
}

/**
 * Get marketplace categories with template counts
 */
export async function getMarketplaceCategories(): Promise<Array<{
  category: string;
  count: number;
}>> {
  const db = await getDb();
  if (!db) return [];
  
  const templates = await db
    .select({ category: abTestTemplates.category })
    .from(abTestTemplates)
    .where(eq(abTestTemplates.isPublic, true));
  
  const categoryCounts: Record<string, number> = {};
  templates.forEach(t => {
    categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
  });
  
  return Object.entries(categoryCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

// ==========================================
// Template Analytics Functions
// ==========================================

/**
 * Track a template event
 */
export async function trackTemplateEvent(
  templateId: number,
  eventType: 'export' | 'import' | 'download' | 'view' | 'use',
  userId?: number,
  metadata?: { source?: string; format?: string; userAgent?: string }
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  await db.insert(templateAnalytics).values({
    templateId,
    eventType,
    userId: userId || null,
    metadata: metadata || null,
  });
  
  return true;
}

/**
 * Get analytics for a specific template
 */
export async function getTemplateAnalytics(templateId: number): Promise<{
  views: number;
  downloads: number;
  exports: number;
  uses: number;
  recentActivity: Array<{ eventType: string; createdAt: Date }>;
}> {
  const db = await getDb();
  if (!db) return { views: 0, downloads: 0, exports: 0, uses: 0, recentActivity: [] };
  
  const events = await db
    .select()
    .from(templateAnalytics)
    .where(eq(templateAnalytics.templateId, templateId))
    .orderBy(desc(templateAnalytics.createdAt));
  
  const views = events.filter(e => e.eventType === 'view').length;
  const downloads = events.filter(e => e.eventType === 'download').length;
  const exports = events.filter(e => e.eventType === 'export').length;
  const uses = events.filter(e => e.eventType === 'use').length;
  
  const recentActivity = events.slice(0, 10).map(e => ({
    eventType: e.eventType,
    createdAt: e.createdAt,
  }));
  
  return { views, downloads, exports, uses, recentActivity };
}

/**
 * Get overall template analytics summary
 */
export async function getTemplateAnalyticsSummary(userId: number): Promise<{
  totalTemplates: number;
  publicTemplates: number;
  totalDownloads: number;
  totalExports: number;
  topTemplates: Array<{
    id: number;
    name: string;
    downloads: number;
    rating: number;
  }>;
}> {
  const db = await getDb();
  if (!db) return { totalTemplates: 0, publicTemplates: 0, totalDownloads: 0, totalExports: 0, topTemplates: [] };
  
  // Get user's templates
  const userTemplates = await db
    .select()
    .from(abTestTemplates)
    .where(eq(abTestTemplates.userId, userId));
  
  const totalTemplates = userTemplates.length;
  const publicTemplates = userTemplates.filter(t => t.isPublic).length;
  
  // Get analytics for user's templates
  const templateIds = userTemplates.map(t => t.id);
  
  let totalDownloads = 0;
  let totalExports = 0;
  const topTemplatesData: Array<{ id: number; name: string; downloads: number; rating: number }> = [];
  
  for (const template of userTemplates.filter(t => t.isPublic)) {
    const analytics = await getTemplateAnalytics(template.id);
    const ratings = await getTemplateRatings(template.id);
    
    totalDownloads += analytics.downloads;
    totalExports += analytics.exports;
    
    topTemplatesData.push({
      id: template.id,
      name: template.name,
      downloads: analytics.downloads,
      rating: ratings.averageRating,
    });
  }
  
  // Sort by downloads and take top 5
  const topTemplates = topTemplatesData
    .sort((a, b) => b.downloads - a.downloads)
    .slice(0, 5);
  
  return { totalTemplates, publicTemplates, totalDownloads, totalExports, topTemplates };
}

/**
 * Get trending templates (most activity in last 7 days)
 */
export async function getTrendingTemplates(limit: number = 10): Promise<Array<{
  template: ABTestTemplate;
  activityScore: number;
  recentDownloads: number;
}>> {
  const db = await getDb();
  if (!db) return [];
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  // Get recent events
  const recentEvents = await db
    .select()
    .from(templateAnalytics)
    .where(gte(templateAnalytics.createdAt, sevenDaysAgo));
  
  // Count events per template
  const templateScores: Record<number, { downloads: number; views: number; uses: number }> = {};
  recentEvents.forEach(event => {
    if (!templateScores[event.templateId]) {
      templateScores[event.templateId] = { downloads: 0, views: 0, uses: 0 };
    }
    if (event.eventType === 'download') templateScores[event.templateId].downloads++;
    if (event.eventType === 'view') templateScores[event.templateId].views++;
    if (event.eventType === 'use') templateScores[event.templateId].uses++;
  });
  
  // Calculate activity scores (downloads * 3 + uses * 2 + views)
  const scoredTemplates = Object.entries(templateScores)
    .map(([id, scores]) => ({
      templateId: parseInt(id),
      activityScore: scores.downloads * 3 + scores.uses * 2 + scores.views,
      recentDownloads: scores.downloads,
    }))
    .sort((a, b) => b.activityScore - a.activityScore)
    .slice(0, limit);
  
  // Get template details
  const results = await Promise.all(
    scoredTemplates.map(async (scored) => {
      const [template] = await db
        .select()
        .from(abTestTemplates)
        .where(and(
          eq(abTestTemplates.id, scored.templateId),
          eq(abTestTemplates.isPublic, true)
        ))
        .limit(1);
      
      return template ? {
        template,
        activityScore: scored.activityScore,
        recentDownloads: scored.recentDownloads,
      } : null;
    })
  );
  
  return results.filter((r): r is NonNullable<typeof r> => r !== null);
}


// ==========================================
// Template Collections Functions
// ==========================================

import { templateCollections, templateCollectionItems, userTemplateUsage } from "../drizzle/schema";
import type { TemplateCollection, InsertTemplateCollection, TemplateCollectionItem, UserTemplateUsage } from "../drizzle/schema";

/**
 * Create a new template collection
 */
export async function createTemplateCollection(
  userId: number,
  data: { name: string; description?: string; isPublic?: boolean; color?: string }
): Promise<TemplateCollection | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [result] = await db.insert(templateCollections).values({
    userId,
    name: data.name,
    description: data.description || null,
    isPublic: data.isPublic || false,
    color: data.color || "#6366f1",
  });
  
  const [collection] = await db
    .select()
    .from(templateCollections)
    .where(eq(templateCollections.id, result.insertId))
    .limit(1);
  
  return collection || null;
}

/**
 * Get user's template collections
 */
export async function getUserCollections(userId: number): Promise<TemplateCollection[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(templateCollections)
    .where(eq(templateCollections.userId, userId))
    .orderBy(desc(templateCollections.updatedAt));
}

/**
 * Get a single collection with its templates
 */
export async function getCollectionWithTemplates(collectionId: number): Promise<{
  collection: TemplateCollection;
  templates: ABTestTemplate[];
} | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [collection] = await db
    .select()
    .from(templateCollections)
    .where(eq(templateCollections.id, collectionId))
    .limit(1);
  
  if (!collection) return null;
  
  // Get template IDs in this collection
  const items = await db
    .select()
    .from(templateCollectionItems)
    .where(eq(templateCollectionItems.collectionId, collectionId))
    .orderBy(templateCollectionItems.sortOrder);
  
  // Get the templates
  const templateIds = items.map(i => i.templateId);
  if (templateIds.length === 0) {
    return { collection, templates: [] };
  }
  
  const templates = await db
    .select()
    .from(abTestTemplates)
    .where(inArray(abTestTemplates.id, templateIds));
  
  // Sort templates by the order in collection
  const sortedTemplates = templateIds
    .map(id => templates.find(t => t.id === id))
    .filter((t): t is ABTestTemplate => t !== undefined);
  
  return { collection, templates: sortedTemplates };
}

/**
 * Update a template collection
 */
export async function updateTemplateCollection(
  collectionId: number,
  userId: number,
  data: { name?: string; description?: string; isPublic?: boolean; color?: string }
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const updateData: Partial<InsertTemplateCollection> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;
  if (data.color !== undefined) updateData.color = data.color;
  
  await db
    .update(templateCollections)
    .set(updateData)
    .where(and(
      eq(templateCollections.id, collectionId),
      eq(templateCollections.userId, userId)
    ));
  
  return true;
}

/**
 * Delete a template collection
 */
export async function deleteTemplateCollection(collectionId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  // Delete collection items first
  await db
    .delete(templateCollectionItems)
    .where(eq(templateCollectionItems.collectionId, collectionId));
  
  // Delete the collection
  await db
    .delete(templateCollections)
    .where(and(
      eq(templateCollections.id, collectionId),
      eq(templateCollections.userId, userId)
    ));
  
  return true;
}

/**
 * Add a template to a collection
 */
export async function addTemplateToCollection(
  collectionId: number,
  templateId: number,
  userId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  // Verify user owns the collection
  const [collection] = await db
    .select()
    .from(templateCollections)
    .where(and(
      eq(templateCollections.id, collectionId),
      eq(templateCollections.userId, userId)
    ))
    .limit(1);
  
  if (!collection) return false;
  
  // Check if already in collection
  const [existing] = await db
    .select()
    .from(templateCollectionItems)
    .where(and(
      eq(templateCollectionItems.collectionId, collectionId),
      eq(templateCollectionItems.templateId, templateId)
    ))
    .limit(1);
  
  if (existing) return true; // Already in collection
  
  // Get max sort order
  const items = await db
    .select({ sortOrder: templateCollectionItems.sortOrder })
    .from(templateCollectionItems)
    .where(eq(templateCollectionItems.collectionId, collectionId));
  
  const maxOrder = items.reduce((max, item) => Math.max(max, item.sortOrder || 0), 0);
  
  // Add to collection
  await db.insert(templateCollectionItems).values({
    collectionId,
    templateId,
    sortOrder: maxOrder + 1,
  });
  
  // Update template count
  await db
    .update(templateCollections)
    .set({ templateCount: sql`${templateCollections.templateCount} + 1` })
    .where(eq(templateCollections.id, collectionId));
  
  return true;
}

/**
 * Remove a template from a collection
 */
export async function removeTemplateFromCollection(
  collectionId: number,
  templateId: number,
  userId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  // Verify user owns the collection
  const [collection] = await db
    .select()
    .from(templateCollections)
    .where(and(
      eq(templateCollections.id, collectionId),
      eq(templateCollections.userId, userId)
    ))
    .limit(1);
  
  if (!collection) return false;
  
  // Remove from collection
  await db
    .delete(templateCollectionItems)
    .where(and(
      eq(templateCollectionItems.collectionId, collectionId),
      eq(templateCollectionItems.templateId, templateId)
    ));
  
  // Update template count
  await db
    .update(templateCollections)
    .set({ templateCount: sql`GREATEST(${templateCollections.templateCount} - 1, 0)` })
    .where(eq(templateCollections.id, collectionId));
  
  return true;
}

/**
 * Get public collections for marketplace
 */
export async function getPublicCollections(options: {
  limit?: number;
  offset?: number;
}): Promise<{ collections: Array<TemplateCollection & { creatorName?: string }>; total: number }> {
  const db = await getDb();
  if (!db) return { collections: [], total: 0 };
  
  const { limit = 20, offset = 0 } = options;
  
  const collections = await db
    .select()
    .from(templateCollections)
    .where(eq(templateCollections.isPublic, true))
    .orderBy(desc(templateCollections.downloadCount))
    .limit(limit)
    .offset(offset);
  
  // Get creator names
  const userIds = Array.from(new Set(collections.map(c => c.userId)));
  const usersData = userIds.length > 0 ? await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, userIds)) : [];
  
  const userMap = new Map(usersData.map(u => [u.id, u.name]));
  
  const collectionsWithCreator = collections.map(c => ({
    ...c,
    creatorName: userMap.get(c.userId) || undefined,
  }));
  
  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(templateCollections)
    .where(eq(templateCollections.isPublic, true));
  
  return { collections: collectionsWithCreator, total: count };
}

/**
 * Download all templates from a collection
 */
export async function downloadCollection(collectionId: number, userId: number): Promise<{
  success: boolean;
  templatesAdded: number;
}> {
  const db = await getDb();
  if (!db) return { success: false, templatesAdded: 0 };
  
  const collectionData = await getCollectionWithTemplates(collectionId);
  if (!collectionData) return { success: false, templatesAdded: 0 };
  
  let templatesAdded = 0;
  
  for (const template of collectionData.templates) {
    if (template.isPublic) {
      const downloaded = await downloadMarketplaceTemplate(template.id, userId);
      if (downloaded) templatesAdded++;
    }
  }
  
  // Increment download count
  await db
    .update(templateCollections)
    .set({ downloadCount: sql`${templateCollections.downloadCount} + 1` })
    .where(eq(templateCollections.id, collectionId));
  
  return { success: true, templatesAdded };
}

// ==========================================
// User Template Usage & Rating Reminder Functions
// ==========================================

/**
 * Track template usage and check if rating reminder should show
 */
export async function trackTemplateUsage(
  userId: number,
  templateId: number
): Promise<{ shouldShowReminder: boolean; usageCount: number }> {
  const db = await getDb();
  if (!db) return { shouldShowReminder: false, usageCount: 0 };
  
  // Get or create usage record
  const [existing] = await db
    .select()
    .from(userTemplateUsage)
    .where(and(
      eq(userTemplateUsage.userId, userId),
      eq(userTemplateUsage.templateId, templateId)
    ))
    .limit(1);
  
  if (existing) {
    // Update usage count
    const newCount = (existing.usageCount || 0) + 1;
    await db
      .update(userTemplateUsage)
      .set({
        usageCount: newCount,
        lastUsedAt: new Date(),
      })
      .where(eq(userTemplateUsage.id, existing.id));
    
    // Check if should show reminder (3+ uses, not rated, not dismissed)
    const shouldShowReminder = newCount >= 3 && !existing.hasRated && !existing.reminderDismissed;
    
    return { shouldShowReminder, usageCount: newCount };
  } else {
    // Create new usage record
    await db.insert(userTemplateUsage).values({
      userId,
      templateId,
      usageCount: 1,
      lastUsedAt: new Date(),
    });
    
    return { shouldShowReminder: false, usageCount: 1 };
  }
}

/**
 * Mark that user has rated a template
 */
export async function markTemplateAsRated(userId: number, templateId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const [existing] = await db
    .select()
    .from(userTemplateUsage)
    .where(and(
      eq(userTemplateUsage.userId, userId),
      eq(userTemplateUsage.templateId, templateId)
    ))
    .limit(1);
  
  if (existing) {
    await db
      .update(userTemplateUsage)
      .set({ hasRated: true })
      .where(eq(userTemplateUsage.id, existing.id));
  } else {
    await db.insert(userTemplateUsage).values({
      userId,
      templateId,
      usageCount: 0,
      hasRated: true,
    });
  }
  
  return true;
}

/**
 * Dismiss rating reminder for a template
 */
export async function dismissRatingReminder(userId: number, templateId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  const [existing] = await db
    .select()
    .from(userTemplateUsage)
    .where(and(
      eq(userTemplateUsage.userId, userId),
      eq(userTemplateUsage.templateId, templateId)
    ))
    .limit(1);
  
  if (existing) {
    await db
      .update(userTemplateUsage)
      .set({ reminderDismissed: true })
      .where(eq(userTemplateUsage.id, existing.id));
  } else {
    await db.insert(userTemplateUsage).values({
      userId,
      templateId,
      usageCount: 0,
      reminderDismissed: true,
    });
  }
  
  return true;
}

/**
 * Get user's template usage stats
 */
export async function getUserTemplateUsageStats(userId: number): Promise<UserTemplateUsage[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(userTemplateUsage)
    .where(eq(userTemplateUsage.userId, userId))
    .orderBy(desc(userTemplateUsage.lastUsedAt));
}

/**
 * Get templates that need rating (used 3+ times, not rated, not dismissed)
 */
export async function getTemplatesNeedingRating(userId: number): Promise<Array<{
  templateId: number;
  usageCount: number;
  templateName?: string;
}>> {
  const db = await getDb();
  if (!db) return [];
  
  const usageRecords = await db
    .select()
    .from(userTemplateUsage)
    .where(and(
      eq(userTemplateUsage.userId, userId),
      gte(userTemplateUsage.usageCount, 3),
      eq(userTemplateUsage.hasRated, false),
      eq(userTemplateUsage.reminderDismissed, false)
    ));
  
  // Get template names
  const templateIds = usageRecords.map(r => r.templateId);
  if (templateIds.length === 0) return [];
  
  const templates = await db
    .select({ id: abTestTemplates.id, name: abTestTemplates.name })
    .from(abTestTemplates)
    .where(inArray(abTestTemplates.id, templateIds));
  
  const templateMap = new Map(templates.map(t => [t.id, t.name]));
  
  return usageRecords.map(r => ({
    templateId: r.templateId,
    usageCount: r.usageCount || 0,
    templateName: templateMap.get(r.templateId),
  }));
}
