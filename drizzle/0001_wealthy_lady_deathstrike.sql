CREATE TABLE `accessibility_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`issueType` enum('navigation','screen_reader','keyboard','visual','cognitive','other') NOT NULL,
	`description` text NOT NULL,
	`pageUrl` varchar(500),
	`status` enum('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
	`resolution` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accessibility_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `approvals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`teamId` int NOT NULL,
	`requestedById` int NOT NULL,
	`reviewedById` int,
	`status` enum('pending','approved','rejected','changes_requested') NOT NULL DEFAULT 'pending',
	`comments` text,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` timestamp,
	CONSTRAINT `approvals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `generated_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`postId` int,
	`prompt` text NOT NULL,
	`imageUrl` varchar(500) NOT NULL,
	`fileKey` varchar(255) NOT NULL,
	`altText` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `generated_images_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledge_base` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`teamId` int,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`type` enum('brand_guideline','swipe_file','ai_instruction','testimonial','faq','other') NOT NULL,
	`tags` json,
	`includeInAiContext` boolean DEFAULT true,
	`priority` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `knowledge_base_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`teamId` int,
	`title` varchar(255),
	`content` text NOT NULL,
	`platform` enum('linkedin','twitter','facebook','instagram','all') NOT NULL,
	`status` enum('draft','scheduled','published','failed') NOT NULL DEFAULT 'draft',
	`scheduledAt` timestamp,
	`publishedAt` timestamp,
	`accessibilityScore` int,
	`accessibilityIssues` json,
	`mediaUrls` json,
	`altTexts` json,
	`analytics` json,
	`hashtags` json,
	`templateId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `social_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`platform` enum('linkedin','twitter','facebook','instagram') NOT NULL,
	`accountId` varchar(255) NOT NULL,
	`accountName` varchar(255),
	`accessToken` text,
	`refreshToken` text,
	`tokenExpiresAt` timestamp,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `social_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','editor','viewer') NOT NULL DEFAULT 'viewer',
	`permissions` json,
	`invitedAt` timestamp NOT NULL DEFAULT (now()),
	`acceptedAt` timestamp,
	CONSTRAINT `team_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`ownerId` int NOT NULL,
	`settings` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` enum('educational','promotional','personal_story','engagement','announcement','custom') DEFAULT 'custom',
	`contentStructure` json,
	`platforms` json,
	`isAccessible` boolean DEFAULT true,
	`accessibilityNotes` text,
	`isPublic` boolean DEFAULT false,
	`usageCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `voice_transcriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`postId` int,
	`audioUrl` varchar(500),
	`transcribedText` text NOT NULL,
	`language` varchar(10),
	`duration` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `voice_transcriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionTier` enum('free','creator','pro') DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `stripeCustomerId` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `stripeSubscriptionId` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `subscriptionStatus` enum('active','canceled','past_due','trialing') DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `users` ADD `accessibilityPreferences` json;--> statement-breakpoint
ALTER TABLE `users` ADD `writingStyleProfile` json;--> statement-breakpoint
ALTER TABLE `users` ADD `monthlyPostsGenerated` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` ADD `lastPostResetDate` timestamp;