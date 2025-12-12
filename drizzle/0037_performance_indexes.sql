-- Performance indexes for frequently queried columns
-- These indexes significantly improve query performance for common operations

-- Posts table indexes (most frequently queried)
CREATE INDEX IF NOT EXISTS `posts_user_id_idx` ON `posts` (`userId`);
CREATE INDEX IF NOT EXISTS `posts_status_idx` ON `posts` (`status`);
CREATE INDEX IF NOT EXISTS `posts_platform_idx` ON `posts` (`platform`);
CREATE INDEX IF NOT EXISTS `posts_scheduled_at_idx` ON `posts` (`scheduledAt`);
CREATE INDEX IF NOT EXISTS `posts_user_status_idx` ON `posts` (`userId`, `status`);
CREATE INDEX IF NOT EXISTS `posts_published_at_idx` ON `posts` (`publishedAt`);

-- Team members indexes (for getUserTeams and team lookups)
CREATE INDEX IF NOT EXISTS `team_members_user_id_idx` ON `team_members` (`userId`);
CREATE INDEX IF NOT EXISTS `team_members_team_id_idx` ON `team_members` (`teamId`);
CREATE INDEX IF NOT EXISTS `team_members_team_user_idx` ON `team_members` (`teamId`, `userId`);

-- Templates indexes
CREATE INDEX IF NOT EXISTS `templates_user_id_idx` ON `templates` (`userId`);
CREATE INDEX IF NOT EXISTS `templates_is_public_idx` ON `templates` (`isPublic`);

-- Knowledge base indexes
CREATE INDEX IF NOT EXISTS `knowledge_base_user_id_idx` ON `knowledge_base` (`userId`);
CREATE INDEX IF NOT EXISTS `knowledge_base_include_ai_idx` ON `knowledge_base` (`includeInAiContext`);

-- Social accounts indexes
CREATE INDEX IF NOT EXISTS `social_accounts_user_id_idx` ON `social_accounts` (`userId`);
CREATE INDEX IF NOT EXISTS `social_accounts_user_platform_idx` ON `social_accounts` (`userId`, `platform`);

-- A/B tests indexes
CREATE INDEX IF NOT EXISTS `ab_tests_user_id_idx` ON `ab_tests` (`userId`);
CREATE INDEX IF NOT EXISTS `ab_tests_status_idx` ON `ab_tests` (`status`);
CREATE INDEX IF NOT EXISTS `ab_test_variants_test_id_idx` ON `ab_test_variants` (`testId`);

-- Email digest preferences indexes
CREATE INDEX IF NOT EXISTS `email_digest_prefs_enabled_idx` ON `email_digest_preferences` (`enabled`);

-- Approvals indexes
CREATE INDEX IF NOT EXISTS `approvals_team_id_idx` ON `approvals` (`teamId`);
CREATE INDEX IF NOT EXISTS `approvals_status_idx` ON `approvals` (`status`);
CREATE INDEX IF NOT EXISTS `approvals_post_id_idx` ON `approvals` (`postId`);

-- Platform goals indexes
CREATE INDEX IF NOT EXISTS `platform_goals_user_id_idx` ON `platform_goals` (`userId`);

-- Digest delivery tracking indexes
CREATE INDEX IF NOT EXISTS `digest_delivery_user_id_idx` ON `digest_delivery_tracking` (`userId`);

-- Blog posts indexes
CREATE INDEX IF NOT EXISTS `blog_posts_status_idx` ON `blog_posts` (`status`);
CREATE INDEX IF NOT EXISTS `blog_posts_published_at_idx` ON `blog_posts` (`publishedAt`);

-- Collection collaborators indexes
CREATE INDEX IF NOT EXISTS `collection_collab_collection_idx` ON `collection_collaborators` (`collectionId`);
CREATE INDEX IF NOT EXISTS `collection_collab_user_idx` ON `collection_collaborators` (`userId`);

-- Template collections indexes
CREATE INDEX IF NOT EXISTS `template_collections_user_idx` ON `template_collections` (`userId`);
CREATE INDEX IF NOT EXISTS `template_collections_public_idx` ON `template_collections` (`isPublic`);

-- Collection followers indexes
CREATE INDEX IF NOT EXISTS `collection_followers_user_idx` ON `collection_followers` (`userId`);
CREATE INDEX IF NOT EXISTS `collection_followers_collection_idx` ON `collection_followers` (`collectionId`);

-- Push subscriptions indexes
CREATE INDEX IF NOT EXISTS `push_subscriptions_user_idx` ON `push_subscriptions` (`userId`);

-- Notification analytics indexes
CREATE INDEX IF NOT EXISTS `notification_analytics_recipient_idx` ON `notification_analytics` (`recipientId`);

-- Email bounces indexes
CREATE INDEX IF NOT EXISTS `email_bounces_email_idx` ON `email_bounces` (`email`);
CREATE INDEX IF NOT EXISTS `email_bounces_user_idx` ON `email_bounces` (`user_id`);
