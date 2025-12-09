CREATE TABLE `notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`emailEnabled` boolean DEFAULT true,
	`emailDigestFrequency` enum('realtime','daily','weekly','never') DEFAULT 'daily',
	`notifyOnPostPublished` boolean DEFAULT true,
	`notifyOnPostFailed` boolean DEFAULT true,
	`notifyOnTeamInvite` boolean DEFAULT true,
	`notifyOnApprovalRequest` boolean DEFAULT true,
	`notifyOnApprovalDecision` boolean DEFAULT true,
	`notifyOnNewFeatures` boolean DEFAULT true,
	`notifyOnAccessibilityTips` boolean DEFAULT true,
	`inAppEnabled` boolean DEFAULT true,
	`soundEnabled` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_preferences_userId_unique` UNIQUE(`userId`)
);
