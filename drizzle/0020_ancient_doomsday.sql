CREATE TABLE `template_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`color` varchar(7) DEFAULT '#6366f1',
	`icon` varchar(50) DEFAULT 'folder',
	`sortOrder` int DEFAULT 0,
	`templateCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `template_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `email_digest_preferences` ADD `isPaused` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `email_digest_preferences` ADD `pausedAt` timestamp;--> statement-breakpoint
ALTER TABLE `email_digest_preferences` ADD `pauseReason` varchar(255);--> statement-breakpoint
ALTER TABLE `email_digest_preferences` ADD `pauseUntil` timestamp;