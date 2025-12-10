import { eq, and, desc, gte, lte, sql, or, like, asc, ne, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
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
  abTestTemplates, InsertTemplateCategory, TemplateCategory
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
