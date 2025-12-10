CREATE TABLE `ab_test_variants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`testId` int NOT NULL,
	`label` varchar(10) NOT NULL,
	`content` text NOT NULL,
	`hashtags` json,
	`mediaUrls` json,
	`postId` int,
	`impressions` int DEFAULT 0,
	`engagements` int DEFAULT 0,
	`clicks` int DEFAULT 0,
	`shares` int DEFAULT 0,
	`comments` int DEFAULT 0,
	`likes` int DEFAULT 0,
	`engagementRate` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ab_test_variants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ab_tests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`platform` enum('linkedin','twitter','facebook','instagram','threads','bluesky') NOT NULL,
	`status` enum('draft','active','completed','cancelled') NOT NULL DEFAULT 'draft',
	`startedAt` timestamp,
	`endedAt` timestamp,
	`durationHours` int DEFAULT 48,
	`winningVariantId` int,
	`confidenceLevel` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ab_tests_id` PRIMARY KEY(`id`)
);
