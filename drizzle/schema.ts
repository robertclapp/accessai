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
  platform: mysqlEnum("platform", ["linkedin", "twitter", "facebook", "instagram", "all"]).notNull(),
  
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
  platforms: json("platforms").$type<("linkedin" | "twitter" | "facebook" | "instagram")[]>(),
  
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
  
  platform: mysqlEnum("platform", ["linkedin", "twitter", "facebook", "instagram"]).notNull(),
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
