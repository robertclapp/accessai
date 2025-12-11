CREATE TABLE `template_collection_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collectionId` int NOT NULL,
	`templateId` int NOT NULL,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `template_collection_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `template_collections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`userId` int NOT NULL,
	`isPublic` boolean DEFAULT false,
	`coverImage` text,
	`color` varchar(7) DEFAULT '#6366f1',
	`templateCount` int DEFAULT 0,
	`downloadCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `template_collections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_template_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`templateId` int NOT NULL,
	`usageCount` int DEFAULT 0,
	`hasRated` boolean DEFAULT false,
	`reminderDismissed` boolean DEFAULT false,
	`lastUsedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_template_usage_id` PRIMARY KEY(`id`)
);
