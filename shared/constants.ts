/**
 * Shared Constants
 * 
 * Centralized configuration values and magic numbers used across the application.
 * This file helps maintain consistency and makes configuration changes easier.
 * 
 * @module shared/constants
 */

// ============================================
// PLATFORM CONFIGURATION
// ============================================

/**
 * Character limits for each social media platform
 */
export const PLATFORM_CHAR_LIMITS = {
  linkedin: 3000,
  twitter: 280,
  facebook: 63206,
  instagram: 2200,
  threads: 500,
  bluesky: 300,
  all: 280 // Use most restrictive for "all" platform
} as const;

/**
 * Recommended hashtag counts per platform
 */
export const PLATFORM_HASHTAG_LIMITS = {
  linkedin: 5,
  twitter: 2,
  facebook: 3,
  instagram: 30,
  threads: 5,
  bluesky: 5,
  all: 2
} as const;

/**
 * Platform display names
 */
export const PLATFORM_DISPLAY_NAMES = {
  linkedin: "LinkedIn",
  twitter: "X (Twitter)",
  facebook: "Facebook",
  instagram: "Instagram",
  threads: "Threads",
  bluesky: "Bluesky",
  all: "All Platforms"
} as const;

/**
 * Platform tips for content creation
 */
export const PLATFORM_TIPS = {
  linkedin: "Professional tone, storytelling works well, use line breaks for readability",
  twitter: "Concise, punchy, conversation starters work well",
  facebook: "Personal, engaging, questions drive comments",
  instagram: "Visual-first, storytelling captions, hashtags at end",
  threads: "Conversational, authentic voice, topic tags instead of hashtags, max 5 links",
  bluesky: "Authentic, conversational, decentralized community focus, 300 char limit",
  all: "Keep it concise to fit all platforms"
} as const;

// ============================================
// SUBSCRIPTION TIERS
// ============================================

/**
 * Subscription tier configuration
 */
export const SUBSCRIPTION_TIERS = {
  free: {
    name: "Free",
    monthlyPostLimit: 10,
    aiGenerationsPerMonth: 5,
    knowledgeBaseItems: 10,
    teamMembers: 0,
    features: [
      "Basic AI content generation",
      "Accessibility checker",
      "5 templates",
      "Single platform posting"
    ]
  },
  creator: {
    name: "Creator",
    monthlyPostLimit: 100,
    aiGenerationsPerMonth: 50,
    knowledgeBaseItems: 100,
    teamMembers: 3,
    features: [
      "Advanced AI with style learning",
      "Voice-to-text input",
      "Unlimited templates",
      "Multi-platform posting",
      "Content calendar",
      "Basic analytics"
    ]
  },
  pro: {
    name: "Pro",
    monthlyPostLimit: -1, // Unlimited
    aiGenerationsPerMonth: -1, // Unlimited
    knowledgeBaseItems: -1, // Unlimited
    teamMembers: -1, // Unlimited
    features: [
      "Everything in Creator",
      "AI image generation",
      "Team collaboration",
      "Approval workflows",
      "Advanced analytics",
      "Priority support",
      "API access"
    ]
  }
} as const;

/**
 * Subscription pricing (in cents)
 */
export const SUBSCRIPTION_PRICING = {
  creator: {
    monthly: 900, // $9/month
    yearly: 7900 // $79/year (~$6.58/month)
  },
  pro: {
    monthly: 2900, // $29/month
    yearly: 24900 // $249/year (~$20.75/month)
  }
} as const;

// ============================================
// ACCESSIBILITY CONFIGURATION
// ============================================

/**
 * Accessibility score thresholds
 */
export const ACCESSIBILITY_THRESHOLDS = {
  excellent: 90,
  good: 70,
  needsWork: 50,
  poor: 0
} as const;

/**
 * Accessibility score labels
 */
export const ACCESSIBILITY_LABELS = {
  excellent: "Excellent",
  good: "Good",
  needsWork: "Needs Work",
  poor: "Poor"
} as const;

/**
 * Get accessibility label from score
 */
export function getAccessibilityLabel(score: number): string {
  if (score >= ACCESSIBILITY_THRESHOLDS.excellent) return ACCESSIBILITY_LABELS.excellent;
  if (score >= ACCESSIBILITY_THRESHOLDS.good) return ACCESSIBILITY_LABELS.good;
  if (score >= ACCESSIBILITY_THRESHOLDS.needsWork) return ACCESSIBILITY_LABELS.needsWork;
  return ACCESSIBILITY_LABELS.poor;
}

/**
 * Get accessibility color class from score
 */
export function getAccessibilityColorClass(score: number): string {
  if (score >= ACCESSIBILITY_THRESHOLDS.excellent) return "text-green-600";
  if (score >= ACCESSIBILITY_THRESHOLDS.good) return "text-blue-600";
  if (score >= ACCESSIBILITY_THRESHOLDS.needsWork) return "text-yellow-600";
  return "text-red-600";
}

// ============================================
// CONTENT GENERATION
// ============================================

/**
 * Maximum content length for AI context
 */
export const AI_CONTEXT_MAX_LENGTH = 8000;

/**
 * Maximum sample content items for style learning
 */
export const MAX_STYLE_SAMPLES = 10;

/**
 * Default AI generation parameters
 */
export const AI_DEFAULTS = {
  temperature: 0.7,
  maxTokens: 1000,
  tone: "professional",
  formality: "professional"
} as const;

// ============================================
// VOICE INPUT
// ============================================

/**
 * Voice recording configuration
 */
export const VOICE_CONFIG = {
  maxDurationMs: 5 * 60 * 1000, // 5 minutes
  maxFileSizeMb: 16, // 16MB (Whisper API limit)
  supportedFormats: ["webm", "mp3", "wav", "ogg", "m4a"] as const,
  defaultLanguage: "en"
} as const;

// ============================================
// TEAM ROLES
// ============================================

/**
 * Team role permissions
 */
export const TEAM_ROLE_PERMISSIONS = {
  owner: {
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canPublish: true,
    canApprove: true,
    canManageMembers: true
  },
  admin: {
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canPublish: true,
    canApprove: true,
    canManageMembers: true
  },
  editor: {
    canCreate: true,
    canEdit: true,
    canDelete: false,
    canPublish: false,
    canApprove: false,
    canManageMembers: false
  },
  viewer: {
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canPublish: false,
    canApprove: false,
    canManageMembers: false
  }
} as const;

// ============================================
// UI CONFIGURATION
// ============================================

/**
 * Font size options for accessibility
 */
export const FONT_SIZE_OPTIONS = {
  small: { label: "Small", value: "14px", scale: 0.875 },
  medium: { label: "Medium", value: "16px", scale: 1 },
  large: { label: "Large", value: "18px", scale: 1.125 },
  xlarge: { label: "Extra Large", value: "20px", scale: 1.25 }
} as const;

/**
 * Animation durations (in milliseconds)
 */
export const ANIMATION_DURATIONS = {
  fast: 150,
  normal: 300,
  slow: 500
} as const;

// ============================================
// API RATE LIMITS
// ============================================

/**
 * Rate limits for external API calls (requests per minute)
 */
export const API_RATE_LIMITS = {
  linkedin: 100,
  twitter: 300,
  facebook: 200,
  instagram: 200,
  threads: 250, // 250 posts per 24 hours
  bluesky: 300, // AT Protocol rate limits
  openai: 60
} as const;

// ============================================
// VALIDATION
// ============================================

/**
 * Input validation limits
 */
export const VALIDATION_LIMITS = {
  titleMaxLength: 255,
  contentMaxLength: 10000,
  tagMaxLength: 50,
  maxTags: 20,
  maxHashtags: 30,
  emailMaxLength: 320,
  nameMaxLength: 100
} as const;

// ============================================
// CACHE CONFIGURATION
// ============================================

/**
 * Cache TTL values (in seconds)
 */
export const CACHE_TTL = {
  userPreferences: 300, // 5 minutes
  templates: 3600, // 1 hour
  analytics: 900, // 15 minutes
  knowledgeBase: 600 // 10 minutes
} as const;
