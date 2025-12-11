CREATE TABLE `collection_followers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`collectionId` int NOT NULL,
	`notificationsEnabled` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `collection_followers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `template_recommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`templateId` int NOT NULL,
	`score` int DEFAULT 0,
	`reason` enum('similar_category','similar_tags','popular','highly_rated','used_by_similar_users') DEFAULT 'popular',
	`seen` boolean DEFAULT false,
	`dismissed` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `template_recommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `template_collections` ADD `followerCount` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `template_collections` ADD `isFeatured` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `template_collections` ADD `averageRating` int DEFAULT 0;