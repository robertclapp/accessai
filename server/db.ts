import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
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
  notificationPreferences, InsertNotificationPreference
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
