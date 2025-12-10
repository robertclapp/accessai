CREATE TABLE `email_digest_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`enabled` boolean DEFAULT true,
	`frequency` enum('weekly','monthly') DEFAULT 'weekly',
	`dayOfWeek` int DEFAULT 1,
	`dayOfMonth` int DEFAULT 1,
	`hourUtc` int DEFAULT 9,
	`includeAnalytics` boolean DEFAULT true,
	`includeGoalProgress` boolean DEFAULT true,
	`includeTopPosts` boolean DEFAULT true,
	`includePlatformComparison` boolean DEFAULT true,
	`includeScheduledPosts` boolean DEFAULT true,
	`lastSentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_digest_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_digest_preferences_userId_unique` UNIQUE(`userId`)
);
