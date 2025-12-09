/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";


/**
 * AccessAI Shared Types
 * These types are used across both client and server
 */

// Platform types
export type Platform = "linkedin" | "twitter" | "facebook" | "instagram" | "all";

// Post status types
export type PostStatus = "draft" | "scheduled" | "published" | "failed";

// Subscription tiers
export type SubscriptionTier = "free" | "creator" | "pro";

// Team roles
export type TeamRole = "owner" | "admin" | "editor" | "viewer";

// Knowledge base item types
export type KnowledgeBaseType = "brand_guideline" | "swipe_file" | "ai_instruction" | "testimonial" | "faq" | "other";

// Accessibility issue types
export type AccessibilityIssueType = "navigation" | "screen_reader" | "keyboard" | "visual" | "cognitive" | "other";

// Accessibility preferences
export interface AccessibilityPreferences {
  highContrast?: boolean;
  dyslexiaFont?: boolean;
  fontSize?: "small" | "medium" | "large" | "xlarge";
  reduceMotion?: boolean;
  screenReaderOptimized?: boolean;
  voiceInputEnabled?: boolean;
  keyboardShortcutsEnabled?: boolean;
}

// Writing style profile
export interface WritingStyleProfile {
  tone?: string;
  formality?: "casual" | "professional" | "academic";
  industry?: string;
  targetAudience?: string;
  sampleContent?: string[];
}

// Accessibility check result
export interface AccessibilityCheckResult {
  score: number;
  issues: AccessibilityIssue[];
  summary: string;
}

export interface AccessibilityIssue {
  type: string;
  message: string;
  severity: "error" | "warning" | "info";
  suggestion?: string;
}

// Content idea from AI
export interface ContentIdea {
  title: string;
  description: string;
  hook: string;
  contentType: string;
  estimatedEngagement: string;
}

// Generated post from AI
export interface GeneratedPost {
  content: string;
  hashtags: string[];
  suggestedImagePrompt: string;
  accessibilityNotes: string;
  accessibility?: AccessibilityCheckResult;
}

// Platform limits and tips
export interface PlatformInfo {
  chars: number;
  hashtags: number;
  tips: string;
}

export const PLATFORM_LIMITS: Record<string, PlatformInfo> = {
  linkedin: {
    chars: 3000,
    hashtags: 5,
    tips: "Professional tone, storytelling works well, use line breaks for readability"
  },
  twitter: {
    chars: 280,
    hashtags: 2,
    tips: "Concise, punchy, conversation starters work well"
  },
  facebook: {
    chars: 63206,
    hashtags: 3,
    tips: "Personal, engaging, questions drive comments"
  },
  instagram: {
    chars: 2200,
    hashtags: 30,
    tips: "Visual-first, storytelling captions, hashtags at end"
  }
};

// Free tier limits
export const FREE_TIER_LIMITS = {
  postsPerMonth: 10,
  socialAccounts: 1,
  templates: 5,
  knowledgeBaseItems: 10
};

// Creator tier limits
export const CREATOR_TIER_LIMITS = {
  postsPerMonth: Infinity,
  socialAccounts: 5,
  templates: Infinity,
  knowledgeBaseItems: Infinity
};

// Pro tier limits
export const PRO_TIER_LIMITS = {
  postsPerMonth: Infinity,
  socialAccounts: Infinity,
  templates: Infinity,
  knowledgeBaseItems: Infinity,
  teamMembers: 5
};
