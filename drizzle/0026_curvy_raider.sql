CREATE TABLE `template_ratings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`userId` int NOT NULL,
	`rating` int NOT NULL,
	`review` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `template_ratings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `template_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`category` varchar(50) NOT NULL,
	`variantATemplate` text NOT NULL,
	`variantBTemplate` text NOT NULL,
	`variantALabel` varchar(100),
	`variantBLabel` varchar(100),
	`tags` json,
	`changeNote` text,
	`changedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `template_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `digest_ab_tests` ADD `scheduledStartAt` timestamp;--> statement-breakpoint
ALTER TABLE `digest_ab_tests` ADD `autoStartEnabled` boolean DEFAULT false;