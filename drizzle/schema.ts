import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table with accessibility preferences and subscription management.
 * Extended from base template to support AccessAI features.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  
  // Subscription management
  subscriptionTier: mysqlEnum("subscriptionTier", ["free", "creator", "pro"]).default("free").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  subscriptionStatus: mysqlEnum("subscriptionStatus", ["active", "canceled", "past_due", "trialing"]).default("active"),
  
  // Accessibility preferences stored as JSON for flexibility
  accessibilityPreferences: json("accessibilityPreferences").$type<{
    highContrast?: boolean;
    dyslexiaFont?: boolean;
    fontSize?: "small" | "medium" | "large" | "xlarge";
    reduceMotion?: boolean;
    screenReaderOptimized?: boolean;
    voiceInputEnabled?: boolean;
    keyboardShortcutsEnabled?: boolean;
  }>(),
  
  // AI personalization - stores writing style preferences
  writingStyleProfile: json("writingStyleProfile").$type<{
    tone?: string;
    formality?: "casual" | "professional" | "academic";
    industry?: string;
    targetAudience?: string;
    sampleContent?: string[];
  }>(),
  
  // Usage tracking for free tier limits
  monthlyPostsGenerated: int("monthlyPostsGenerated").default(0),
  lastPostResetDate: timestamp("lastPostResetDate"),
  
  // Onboarding tracking
  hasCompletedTour: boolean("hasCompletedTour").default(false),
  tourCompletedAt: timestamp("tourCompletedAt"),
  
  // Email verification
  emailVerified: boolean("emailVerified").default(false),
  emailVerifiedAt: timestamp("emailVerifiedAt"),
  
  // Account deletion (GDPR compliance)
  deletionScheduledAt: timestamp("deletionScheduledAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Social media posts with multi-platform support and accessibility scoring.
 */
export const posts = mysqlTable("posts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  teamId: int("teamId"), // Optional team association
  
  // Content
  title: varchar("title", { length: 255 }),
  content: text("content").notNull(),
  platform: mysqlEnum("platform", ["linkedin", "twitter", "facebook", "instagram", "threads", "bluesky", "mastodon", "all"]).notNull(),
  
  // Status and scheduling
  status: mysqlEnum("status", ["draft", "scheduled", "published", "failed"]).default("draft").notNull(),
  scheduledAt: timestamp("scheduledAt"),
  publishedAt: timestamp("publishedAt"),
  
  // Accessibility
  accessibilityScore: int("accessibilityScore"), // 0-100 score
  accessibilityIssues: json("accessibilityIssues").$type<{
    type: string;
    message: string;
    severity: "error" | "warning" | "info";
    suggestion?: string;
  }[]>(),
  
  // Media attachments
  mediaUrls: json("mediaUrls").$type<string[]>(),
  altTexts: json("altTexts").$type<Record<string, string>>(), // URL -> alt text mapping
  
  // Analytics (updated after publishing)
  analytics: json("analytics").$type<{
    impressions?: number;
    engagements?: number;
    clicks?: number;
    shares?: number;
    comments?: number;
    likes?: number;
  }>(),
  
  // Metadata
  hashtags: json("hashtags").$type<string[]>(),
  templateId: int("templateId"),
  
  // Mastodon-specific: Content Warning (spoiler text)
  contentWarning: varchar("contentWarning", { length: 500 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;

/**
 * Content templates and frameworks for the smart post builder.
 */
export const templates = mysqlTable("templates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // Null for system templates
  
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["educational", "promotional", "personal_story", "engagement", "announcement", "custom"]).default("custom"),
  
  // Template structure
  contentStructure: json("contentStructure").$type<{
    sections: {
      name: string;
      placeholder: string;
      required: boolean;
      aiPrompt?: string;
    }[];
    framework?: "aida" | "pas" | "slay" | "hook_story_offer" | "custom";
  }>(),
  
  // Platform compatibility
  platforms: json("platforms").$type<("linkedin" | "twitter" | "facebook" | "instagram" | "threads" | "bluesky" | "mastodon")[]>(),
  
  // Accessibility
  isAccessible: boolean("isAccessible").default(true),
  accessibilityNotes: text("accessibilityNotes"),
  
  isPublic: boolean("isPublic").default(false),
  usageCount: int("usageCount").default(0),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = typeof templates.$inferInsert;

/**
 * Knowledge base for storing brand guidelines, swipe files, and AI instructions.
 */
export const knowledgeBase = mysqlTable("knowledge_base", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  teamId: int("teamId"), // Optional team sharing
  
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  type: mysqlEnum("type", ["brand_guideline", "swipe_file", "ai_instruction", "testimonial", "faq", "other"]).notNull(),
  
  // Categorization
  tags: json("tags").$type<string[]>(),
  
  // AI usage settings
  includeInAiContext: boolean("includeInAiContext").default(true),
  priority: int("priority").default(0), // Higher priority = more likely to be included in AI context
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KnowledgeBaseItem = typeof knowledgeBase.$inferSelect;
export type InsertKnowledgeBaseItem = typeof knowledgeBase.$inferInsert;

/**
 * Teams for collaboration features.
 */
export const teams = mysqlTable("teams", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  ownerId: int("ownerId").notNull(),
  
  // Team settings
  settings: json("settings").$type<{
    requireApproval?: boolean;
    defaultPlatforms?: string[];
    brandColors?: string[];
  }>(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;

/**
 * Team membership with roles and permissions.
 */
export const teamMembers = mysqlTable("team_members", {
  id: int("id").autoincrement().primaryKey(),
  teamId: int("teamId").notNull(),
  userId: int("userId").notNull(),
  
  role: mysqlEnum("role", ["owner", "admin", "editor", "viewer"]).default("viewer").notNull(),
  
  // Permissions override (if null, use role defaults)
  permissions: json("permissions").$type<{
    canCreate?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
    canPublish?: boolean;
    canApprove?: boolean;
    canManageMembers?: boolean;
  }>(),
  
  invitedAt: timestamp("invitedAt").defaultNow().notNull(),
  acceptedAt: timestamp("acceptedAt"),
});

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = typeof teamMembers.$inferInsert;

/**
 * Approval workflow for team collaboration.
 */
export const approvals = mysqlTable("approvals", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull(),
  teamId: int("teamId").notNull(),
  
  requestedById: int("requestedById").notNull(),
  reviewedById: int("reviewedById"),
  
  status: mysqlEnum("status", ["pending", "approved", "rejected", "changes_requested"]).default("pending").notNull(),
  comments: text("comments"),
  
  requestedAt: timestamp("requestedAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
});

export type Approval = typeof approvals.$inferSelect;
export type InsertApproval = typeof approvals.$inferInsert;

/**
 * Social media account connections for direct posting.
 */
export const socialAccounts = mysqlTable("social_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  platform: mysqlEnum("platform", ["linkedin", "twitter", "facebook", "instagram", "threads", "bluesky", "mastodon"]).notNull(),
  accountId: varchar("accountId", { length: 255 }).notNull(),
  accountName: varchar("accountName", { length: 255 }),
  
  // Tokens stored encrypted
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  
  isActive: boolean("isActive").default(true),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SocialAccount = typeof socialAccounts.$inferSelect;
export type InsertSocialAccount = typeof socialAccounts.$inferInsert;

/**
 * Generated images for posts.
 */
export const generatedImages = mysqlTable("generated_images", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  postId: int("postId"),
  
  prompt: text("prompt").notNull(),
  imageUrl: varchar("imageUrl", { length: 500 }).notNull(),
  fileKey: varchar("fileKey", { length: 255 }).notNull(),
  
  altText: text("altText"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GeneratedImage = typeof generatedImages.$inferSelect;
export type InsertGeneratedImage = typeof generatedImages.$inferInsert;

/**
 * Voice transcription history for the voice-to-text feature.
 */
export const voiceTranscriptions = mysqlTable("voice_transcriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  postId: int("postId"),
  
  audioUrl: varchar("audioUrl", { length: 500 }),
  transcribedText: text("transcribedText").notNull(),
  language: varchar("language", { length: 10 }),
  duration: int("duration"), // Duration in seconds
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VoiceTranscription = typeof voiceTranscriptions.$inferSelect;
export type InsertVoiceTranscription = typeof voiceTranscriptions.$inferInsert;

/**
 * Accessibility issue reports from users.
 */
export const accessibilityReports = mysqlTable("accessibility_reports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  issueType: mysqlEnum("issueType", ["navigation", "screen_reader", "keyboard", "visual", "cognitive", "other"]).notNull(),
  description: text("description").notNull(),
  pageUrl: varchar("pageUrl", { length: 500 }),
  
  status: mysqlEnum("status", ["open", "in_progress", "resolved", "closed"]).default("open").notNull(),
  resolution: text("resolution"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AccessibilityReport = typeof accessibilityReports.$inferSelect;
export type InsertAccessibilityReport = typeof accessibilityReports.$inferInsert;


/**
 * User notification preferences for email and in-app notifications.
 */
export const notificationPreferences = mysqlTable("notification_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  
  // Email notifications
  emailEnabled: boolean("emailEnabled").default(true),
  emailDigestFrequency: mysqlEnum("emailDigestFrequency", ["realtime", "daily", "weekly", "never"]).default("daily"),
  
  // Notification types
  notifyOnPostPublished: boolean("notifyOnPostPublished").default(true),
  notifyOnPostFailed: boolean("notifyOnPostFailed").default(true),
  notifyOnTeamInvite: boolean("notifyOnTeamInvite").default(true),
  notifyOnApprovalRequest: boolean("notifyOnApprovalRequest").default(true),
  notifyOnApprovalDecision: boolean("notifyOnApprovalDecision").default(true),
  notifyOnNewFeatures: boolean("notifyOnNewFeatures").default(true),
  notifyOnAccessibilityTips: boolean("notifyOnAccessibilityTips").default(true),
  
  // In-app notifications
  inAppEnabled: boolean("inAppEnabled").default(true),
  soundEnabled: boolean("soundEnabled").default(false),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;


/**
 * Email verification tokens for secure email confirmation.
 * Tokens expire after 24 hours and are single-use.
 */
export const verificationTokens = mysqlTable("verification_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Secure random token (hashed for storage)
  token: varchar("token", { length: 255 }).notNull().unique(),
  
  // Token type for future extensibility (email, password reset, etc.)
  type: mysqlEnum("type", ["email_verification", "password_reset", "email_change"]).default("email_verification").notNull(),
  
  // The email being verified (in case user changes email)
  email: varchar("email", { length: 320 }).notNull(),
  
  // Token expiration (24 hours from creation)
  expiresAt: timestamp("expiresAt").notNull(),
  
  // Whether token has been used
  usedAt: timestamp("usedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VerificationToken = typeof verificationTokens.$inferSelect;
export type InsertVerificationToken = typeof verificationTokens.$inferInsert;


// ============================================
// BLOG/CONTENT HUB TABLES
// ============================================

/**
 * Blog categories for organizing content
 */
export const blogCategories = mysqlTable("blog_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  color: varchar("color", { length: 7 }), // Hex color for UI
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BlogCategory = typeof blogCategories.$inferSelect;
export type InsertBlogCategory = typeof blogCategories.$inferInsert;

/**
 * Blog tags for flexible content tagging
 */
export const blogTags = mysqlTable("blog_tags", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BlogTag = typeof blogTags.$inferSelect;
export type InsertBlogTag = typeof blogTags.$inferInsert;

/**
 * Blog posts - the main content table
 */
export const blogPosts = mysqlTable("blog_posts", {
  id: int("id").autoincrement().primaryKey(),
  
  // Content
  title: varchar("title", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  excerpt: text("excerpt"), // Short summary for listings
  content: text("content").notNull(), // Full markdown content
  
  // Media
  featuredImage: varchar("featuredImage", { length: 500 }),
  featuredImageAlt: varchar("featuredImageAlt", { length: 200 }), // Accessibility!
  
  // SEO
  metaTitle: varchar("metaTitle", { length: 70 }), // Optimal SEO title length
  metaDescription: varchar("metaDescription", { length: 160 }), // Optimal meta description
  canonicalUrl: varchar("canonicalUrl", { length: 500 }),
  
  // Organization
  categoryId: int("categoryId"),
  authorId: int("authorId").notNull(),
  
  // Status
  status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft").notNull(),
  featured: boolean("featured").default(false),
  
  // Engagement
  viewCount: int("viewCount").default(0),
  readingTimeMinutes: int("readingTimeMinutes").default(5),
  
  // Timestamps
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = typeof blogPosts.$inferInsert;

/**
 * Many-to-many relationship between posts and tags
 */
export const blogPostTags = mysqlTable("blog_post_tags", {
  id: int("id").autoincrement().primaryKey(),
  postId: int("postId").notNull(),
  tagId: int("tagId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BlogPostTag = typeof blogPostTags.$inferSelect;
export type InsertBlogPostTag = typeof blogPostTags.$inferInsert;


/**
 * Testimonials table for social proof on landing page.
 * Stores customer testimonials with ratings and display preferences.
 */
export const testimonials = mysqlTable("testimonials", {
  id: int("id").autoincrement().primaryKey(),
  /** Customer's full name */
  name: varchar("name", { length: 255 }).notNull(),
  /** Customer's job title or role */
  role: varchar("role", { length: 255 }),
  /** Customer's company or organization */
  company: varchar("company", { length: 255 }),
  /** The testimonial quote */
  quote: text("quote").notNull(),
  /** URL to customer's avatar/photo */
  avatarUrl: varchar("avatarUrl", { length: 500 }),
  /** Star rating (1-5) */
  rating: int("rating").default(5),
  /** Whether this testimonial is featured/highlighted */
  featured: boolean("featured").default(false),
  /** Display order for sorting */
  displayOrder: int("displayOrder").default(0),
  /** Whether the testimonial is active/visible */
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Testimonial = typeof testimonials.$inferSelect;
export type InsertTestimonial = typeof testimonials.$inferInsert;

/**
 * Featured partners/media logos for "As Seen In" or "Trusted By" sections.
 * Stores logos of media outlets, partners, or notable customers.
 */
export const featuredPartners = mysqlTable("featured_partners", {
  id: int("id").autoincrement().primaryKey(),
  /** Partner/media outlet name */
  name: varchar("name", { length: 255 }).notNull(),
  /** URL to the partner's logo image */
  logoUrl: varchar("logoUrl", { length: 500 }).notNull(),
  /** Optional link to partner's website or article */
  websiteUrl: varchar("websiteUrl", { length: 500 }),
  /** Type of partner (media, customer, partner, integration) */
  partnerType: mysqlEnum("partnerType", ["media", "customer", "partner", "integration"]).default("partner"),
  /** Display order for sorting */
  displayOrder: int("displayOrder").default(0),
  /** Whether the partner is active/visible */
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FeaturedPartner = typeof featuredPartners.$inferSelect;
export type InsertFeaturedPartner = typeof featuredPartners.$inferInsert;


/**
 * Platform Goals
 * 
 * Stores user-defined engagement rate targets per platform.
 * Tracks goal progress and achievement history.
 */
export const platformGoals = mysqlTable("platform_goals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** Target platform */
  platform: mysqlEnum("platform", ["linkedin", "twitter", "facebook", "instagram", "threads", "bluesky", "mastodon"]).notNull(),
  /** Target engagement rate percentage (e.g., 5.0 = 5%) */
  targetEngagementRate: int("targetEngagementRate").notNull(),
  /** Target number of posts per period */
  targetPostsPerMonth: int("targetPostsPerMonth"),
  /** Target impressions per post */
  targetImpressionsPerPost: int("targetImpressionsPerPost"),
  /** Goal period type */
  periodType: mysqlEnum("periodType", ["weekly", "monthly", "quarterly"]).default("monthly"),
  /** Whether the goal is currently active */
  isActive: boolean("isActive").default(true),
  /** When the goal was achieved (if applicable) */
  achievedAt: timestamp("achievedAt"),
  /** Notes about the goal */
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PlatformGoal = typeof platformGoals.$inferSelect;
export type InsertPlatformGoal = typeof platformGoals.$inferInsert;

/**
 * Goal History
 * 
 * Tracks historical progress toward goals for trend analysis.
 */
export const goalHistory = mysqlTable("goal_history", {
  id: int("id").autoincrement().primaryKey(),
  goalId: int("goalId").notNull(),
  userId: int("userId").notNull(),
  /** Recorded engagement rate at this point */
  engagementRate: int("engagementRate").notNull(),
  /** Number of posts in this period */
  postCount: int("postCount").default(0),
  /** Total impressions in this period */
  impressions: int("impressions").default(0),
  /** Progress percentage toward goal (0-100+) */
  progressPercent: int("progressPercent").default(0),
  /** Period start date */
  periodStart: timestamp("periodStart").notNull(),
  /** Period end date */
  periodEnd: timestamp("periodEnd").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GoalHistory = typeof goalHistory.$inferSelect;
export type InsertGoalHistory = typeof goalHistory.$inferInsert;

/**
 * Industry Benchmarks
 * 
 * Stores industry-average engagement metrics for comparison.
 * Updated periodically from research data.
 */
export const industryBenchmarks = mysqlTable("industry_benchmarks", {
  id: int("id").autoincrement().primaryKey(),
  /** Industry category */
  industry: varchar("industry", { length: 100 }).notNull(),
  /** Platform for the benchmark */
  platform: mysqlEnum("platform", ["linkedin", "twitter", "facebook", "instagram", "threads", "bluesky", "mastodon"]).notNull(),
  /** Average engagement rate for this industry/platform */
  avgEngagementRate: int("avgEngagementRate").notNull(),
  /** Median engagement rate */
  medianEngagementRate: int("medianEngagementRate"),
  /** Top 10% engagement rate threshold */
  topPerformerRate: int("topPerformerRate"),
  /** Average posts per week */
  avgPostsPerWeek: int("avgPostsPerWeek"),
  /** Average impressions per post */
  avgImpressionsPerPost: int("avgImpressionsPerPost"),
  /** Data source for the benchmark */
  dataSource: varchar("dataSource", { length: 255 }),
  /** When the benchmark data was collected */
  dataCollectedAt: timestamp("dataCollectedAt"),
  /** Year the benchmark applies to */
  benchmarkYear: int("benchmarkYear").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type IndustryBenchmark = typeof industryBenchmarks.$inferSelect;
export type InsertIndustryBenchmark = typeof industryBenchmarks.$inferInsert;


/**
 * Email digest preferences for weekly/monthly analytics reports.
 */
export const emailDigestPreferences = mysqlTable("email_digest_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  
  /** Whether digest emails are enabled */
  enabled: boolean("enabled").default(true),
  /** Digest frequency */
  frequency: mysqlEnum("frequency", ["weekly", "monthly"]).default("weekly"),
  /** Day of week for weekly digests (0=Sunday, 6=Saturday) */
  dayOfWeek: int("dayOfWeek").default(1), // Monday
  /** Day of month for monthly digests (1-28) */
  dayOfMonth: int("dayOfMonth").default(1),
  /** Hour to send (0-23 in UTC) */
  hourUtc: int("hourUtc").default(9), // 9 AM UTC
  
  /** Include analytics summary */
  includeAnalytics: boolean("includeAnalytics").default(true),
  /** Include goal progress */
  includeGoalProgress: boolean("includeGoalProgress").default(true),
  /** Include top performing posts */
  includeTopPosts: boolean("includeTopPosts").default(true),
  /** Include platform comparison */
  includePlatformComparison: boolean("includePlatformComparison").default(true),
  /** Include upcoming scheduled posts */
  includeScheduledPosts: boolean("includeScheduledPosts").default(true),
  
  /** Last digest sent timestamp */
  lastSentAt: timestamp("lastSentAt"),
  
  /** Pause/Resume functionality */
  isPaused: boolean("isPaused").default(false),
  pausedAt: timestamp("pausedAt"),
  pauseReason: varchar("pauseReason", { length: 255 }),
  pauseUntil: timestamp("pauseUntil"), // Optional auto-resume date
  
  /** When the last pause reminder was sent */
  pauseReminderSentAt: timestamp("pauseReminderSentAt"),
  
  /** Custom section order (JSON array of section keys) */
  sectionOrder: text("sectionOrder"), // JSON: ["analytics", "goalProgress", "topPosts", "platformComparison", "scheduledPosts"]
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailDigestPreference = typeof emailDigestPreferences.$inferSelect;
export type InsertEmailDigestPreference = typeof emailDigestPreferences.$inferInsert;


/**
 * A/B test experiments for comparing content variants.
 */
export const abTests = mysqlTable("ab_tests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  /** Test name/title */
  name: varchar("name", { length: 255 }).notNull(),
  /** Test description */
  description: text("description"),
  /** Target platform for the test */
  platform: mysqlEnum("platform", ["linkedin", "twitter", "facebook", "instagram", "threads", "bluesky", "mastodon"]).notNull(),
  
  /** Test status */
  status: mysqlEnum("status", ["draft", "active", "completed", "cancelled"]).default("draft").notNull(),
  /** Test start date */
  startedAt: timestamp("startedAt"),
  /** Test end date */
  endedAt: timestamp("endedAt"),
  /** Duration in hours */
  durationHours: int("durationHours").default(48),
  
  /** Winning variant ID (set when test completes) */
  winningVariantId: int("winningVariantId"),
  /** Statistical confidence level (0-100) */
  confidenceLevel: int("confidenceLevel"),
  
  /** Bulk test group ID - links tests created together across platforms */
  bulkTestGroupId: varchar("bulkTestGroupId", { length: 36 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ABTest = typeof abTests.$inferSelect;
export type InsertABTest = typeof abTests.$inferInsert;

/**
 * Variants within an A/B test.
 */
export const abTestVariants = mysqlTable("ab_test_variants", {
  id: int("id").autoincrement().primaryKey(),
  testId: int("testId").notNull(),
  
  /** Variant label (A, B, C, etc.) */
  label: varchar("label", { length: 10 }).notNull(),
  /** Variant content */
  content: text("content").notNull(),
  /** Hashtags for this variant */
  hashtags: json("hashtags").$type<string[]>(),
  /** Media URLs for this variant */
  mediaUrls: json("mediaUrls").$type<string[]>(),
  
  /** Associated post ID (created when test starts) */
  postId: int("postId"),
  
  /** Analytics for this variant */
  impressions: int("impressions").default(0),
  engagements: int("engagements").default(0),
  clicks: int("clicks").default(0),
  shares: int("shares").default(0),
  comments: int("comments").default(0),
  likes: int("likes").default(0),
  
  /** Calculated engagement rate (stored for quick access) */
  engagementRate: int("engagementRate").default(0), // Stored as basis points (e.g., 250 = 2.50%)
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ABTestVariant = typeof abTestVariants.$inferSelect;
export type InsertABTestVariant = typeof abTestVariants.$inferInsert;


/**
 * Content warning presets for Mastodon posts.
 * Allows users to save commonly used content warnings for quick selection.
 */
export const cwPresets = mysqlTable("cw_presets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  /** Preset name/label */
  name: varchar("name", { length: 100 }).notNull(),
  /** The actual content warning text */
  text: varchar("text", { length: 500 }).notNull(),
  /** Usage count for sorting by popularity */
  usageCount: int("usageCount").default(0),
  /** Whether this is a system default preset */
  isDefault: boolean("isDefault").default(false),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CWPreset = typeof cwPresets.$inferSelect;
export type InsertCWPreset = typeof cwPresets.$inferInsert;


/**
 * Mastodon-specific templates with content warning presets.
 * Extends the general templates system with Mastodon-specific features.
 */
export const mastodonTemplates = mysqlTable("mastodon_templates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // Null for system templates
  
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", [
    "news", "opinion", "art", "photography", "tech", 
    "gaming", "food", "politics", "health", "personal", "other"
  ]).default("other"),
  
  /** Template content with placeholders */
  content: text("content").notNull(),
  
  /** Default content warning text */
  defaultCW: varchar("defaultCW", { length: 500 }),
  
  /** Linked CW preset ID */
  cwPresetId: int("cwPresetId"),
  
  /** Default visibility for posts using this template */
  defaultVisibility: mysqlEnum("defaultVisibility", ["public", "unlisted", "followers_only", "direct"]).default("public"),
  
  /** Whether this is a system template */
  isSystem: boolean("isSystem").default(false),
  
  /** Whether this template is public */
  isPublic: boolean("isPublic").default(false),
  
  /** Usage tracking */
  usageCount: int("usageCount").default(0),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MastodonTemplate = typeof mastodonTemplates.$inferSelect;
export type InsertMastodonTemplate = typeof mastodonTemplates.$inferInsert;


/**
 * Email digest delivery tracking for open and click analytics.
 * Tracks individual digest sends with engagement metrics.
 */
export const digestDeliveryTracking = mysqlTable("digest_delivery_tracking", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  /** Unique tracking ID for this digest send */
  trackingId: varchar("trackingId", { length: 64 }).notNull().unique(),
  
  /** Digest type (weekly/monthly) */
  digestType: mysqlEnum("digestType", ["weekly", "monthly"]).notNull(),
  
  /** Period covered by this digest */
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),
  
  /** Delivery status */
  status: mysqlEnum("status", ["sent", "opened", "clicked", "bounced", "failed"]).default("sent").notNull(),
  
  /** When the digest was sent */
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  
  /** When the digest was first opened (tracking pixel fired) */
  openedAt: timestamp("openedAt"),
  
  /** Number of times the digest was opened */
  openCount: int("openCount").default(0),
  
  /** When a link was first clicked */
  firstClickAt: timestamp("firstClickAt"),
  
  /** Total number of link clicks */
  clickCount: int("clickCount").default(0),
  
  /** Links clicked (stored as JSON array) */
  clickedLinks: json("clickedLinks").$type<{
    url: string;
    clickedAt: number; // timestamp
    section?: string; // e.g., "analytics", "top_posts", "goals"
  }[]>(),
  
  /** Email recipient address */
  recipientEmail: varchar("recipientEmail", { length: 320 }),
  
  /** User agent from open tracking */
  userAgent: text("userAgent"),
  
  /** IP address from open tracking (hashed for privacy) */
  ipHash: varchar("ipHash", { length: 64 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DigestDeliveryTracking = typeof digestDeliveryTracking.$inferSelect;
export type InsertDigestDeliveryTracking = typeof digestDeliveryTracking.$inferInsert;


/**
 * Custom template categories for organizing Mastodon templates.
 * Users can create their own categories beyond the default ones.
 */
export const templateCategories = mysqlTable("template_categories", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  /** Category name */
  name: varchar("name", { length: 100 }).notNull(),
  
  /** Category description */
  description: text("description"),
  
  /** Color for visual identification (hex code) */
  color: varchar("color", { length: 7 }).default("#6366f1"),
  
  /** Icon name (from lucide icons) */
  icon: varchar("icon", { length: 50 }).default("folder"),
  
  /** Display order */
  sortOrder: int("sortOrder").default(0),
  
  /** Number of templates in this category */
  templateCount: int("templateCount").default(0),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TemplateCategory = typeof templateCategories.$inferSelect;
export type InsertTemplateCategory = typeof templateCategories.$inferInsert;


/**
 * A/B Test Templates - Reusable templates for common content variations.
 * Users can create tests from these templates to save time.
 */
export const abTestTemplates = mysqlTable("ab_test_templates", {
  id: int("id").autoincrement().primaryKey(),
  
  /** Template name */
  name: varchar("name", { length: 255 }).notNull(),
  
  /** Template description */
  description: text("description"),
  
  /** Category of variation (e.g., "headline", "cta", "tone") */
  category: varchar("category", { length: 100 }).notNull(),
  
  /** Whether this is a system template (not editable by users) */
  isSystem: boolean("isSystem").default(false),
  
  /** User who created this template (null for system templates) */
  userId: int("userId"),
  
  /** Target platform(s) - null means all platforms */
  platforms: json("platforms").$type<string[]>(),
  
  /** Variant A content template */
  variantATemplate: text("variantATemplate").notNull(),
  
  /** Variant A label/name */
  variantALabel: varchar("variantALabel", { length: 100 }).default("Variant A"),
  
  /** Variant B content template */
  variantBTemplate: text("variantBTemplate").notNull(),
  
  /** Variant B label/name */
  variantBLabel: varchar("variantBLabel", { length: 100 }).default("Variant B"),
  
  /** Example use case */
  exampleUseCase: text("exampleUseCase"),
  
  /** Tags for filtering */
  tags: json("tags").$type<string[]>(),
  
  /** Usage count (how many tests created from this template) */
  usageCount: int("usageCount").default(0),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ABTestTemplate = typeof abTestTemplates.$inferSelect;
export type InsertABTestTemplate = typeof abTestTemplates.$inferInsert;
