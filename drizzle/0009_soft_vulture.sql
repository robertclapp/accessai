CREATE TABLE `goal_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`goalId` int NOT NULL,
	`userId` int NOT NULL,
	`engagementRate` int NOT NULL,
	`postCount` int DEFAULT 0,
	`impressions` int DEFAULT 0,
	`progressPercent` int DEFAULT 0,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `goal_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `industry_benchmarks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`industry` varchar(100) NOT NULL,
	`platform` enum('linkedin','twitter','facebook','instagram','threads') NOT NULL,
	`avgEngagementRate` int NOT NULL,
	`medianEngagementRate` int,
	`topPerformerRate` int,
	`avgPostsPerWeek` int,
	`avgImpressionsPerPost` int,
	`dataSource` varchar(255),
	`dataCollectedAt` timestamp,
	`benchmarkYear` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `industry_benchmarks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platform_goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`platform` enum('linkedin','twitter','facebook','instagram','threads') NOT NULL,
	`targetEngagementRate` int NOT NULL,
	`targetPostsPerMonth` int,
	`targetImpressionsPerPost` int,
	`periodType` enum('weekly','monthly','quarterly') DEFAULT 'monthly',
	`isActive` boolean DEFAULT true,
	`achievedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `platform_goals_id` PRIMARY KEY(`id`)
);
