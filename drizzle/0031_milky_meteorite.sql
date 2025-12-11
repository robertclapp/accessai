CREATE TABLE `collection_collaborators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collectionId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('viewer','editor','admin') DEFAULT 'editor',
	`status` enum('pending','accepted','declined') DEFAULT 'pending',
	`invitedBy` int NOT NULL,
	`invitationMessage` text,
	`respondedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `collection_collaborators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `digest_email_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`enabled` boolean DEFAULT true,
	`frequency` enum('daily','weekly','monthly') DEFAULT 'weekly',
	`preferredDay` int DEFAULT 1,
	`preferredHour` int DEFAULT 9,
	`includeFollowedCollections` boolean DEFAULT true,
	`includeTrending` boolean DEFAULT true,
	`includeRecommendations` boolean DEFAULT true,
	`maxTemplatesPerSection` int DEFAULT 5,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `digest_email_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `digest_email_preferences_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `weekly_digest_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`followedCollectionTemplates` int DEFAULT 0,
	`trendingTemplates` int DEFAULT 0,
	`recommendedTemplates` int DEFAULT 0,
	`sent` boolean DEFAULT false,
	`errorMessage` text,
	`opened` boolean DEFAULT false,
	`openedAt` timestamp,
	`clicked` boolean DEFAULT false,
	`clickedAt` timestamp,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `weekly_digest_logs_id` PRIMARY KEY(`id`)
);
