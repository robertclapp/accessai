/**
 * Database Module Index
 *
 * Re-exports all database operations from individual modules.
 * This provides backwards compatibility with the original db.ts
 * while allowing for better code organization.
 */

// Connection management
export { getDb, resetDbConnection } from "./connection";

// User operations
export {
  upsertUser,
  getUserByOpenId,
  getUserById,
  getUserByStripeCustomerId,
  updateUserPreferences,
  updateUserProfile,
  updateUserAccessibilityPreferences,
  updateUserWritingStyle,
  updateUserSubscription,
  incrementUserPostCount,
  resetMonthlyPostCount,
  updateUserOnboarding,
} from "./users";

// Post operations
export {
  createPost,
  getPostById,
  getUserPosts,
  updatePost,
  deletePost,
  getScheduledPosts,
  getScheduledPostsDue,
  updatePostAnalytics,
  getUserAnalyticsSummary,
} from "./posts";

// Re-export all other operations from the original db.ts
// These will be migrated to individual modules over time
export * from "../db";
