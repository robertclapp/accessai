CREATE TABLE `push_notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`enabled` boolean NOT NULL DEFAULT true,
	`activityAlerts` boolean NOT NULL DEFAULT true,
	`digestReminders` boolean NOT NULL DEFAULT true,
	`collaboratorUpdates` boolean NOT NULL DEFAULT true,
	`systemAnnouncements` boolean NOT NULL DEFAULT true,
	`quietHoursEnabled` boolean NOT NULL DEFAULT false,
	`quietHoursStart` int DEFAULT 22,
	`quietHoursEnd` int DEFAULT 8,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `push_notification_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `push_notification_preferences_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`endpoint` text NOT NULL,
	`p256dhKey` text NOT NULL,
	`authKey` text NOT NULL,
	`userAgent` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastUsedAt` timestamp,
	CONSTRAINT `push_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scheduler_job_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` varchar(100) NOT NULL,
	`jobName` varchar(255) NOT NULL,
	`status` enum('success','failure','running','skipped') NOT NULL,
	`startedAt` timestamp NOT NULL,
	`completedAt` timestamp,
	`durationMs` int,
	`resultSummary` text,
	`errorMessage` text,
	`itemsProcessed` int DEFAULT 0,
	`itemsSuccessful` int DEFAULT 0,
	`itemsFailed` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scheduler_job_history_id` PRIMARY KEY(`id`)
);
