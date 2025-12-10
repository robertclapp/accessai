CREATE TABLE `mastodon_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` enum('news','opinion','art','photography','tech','gaming','food','politics','health','personal','other') DEFAULT 'other',
	`content` text NOT NULL,
	`defaultCW` varchar(500),
	`cwPresetId` int,
	`defaultVisibility` enum('public','unlisted','followers_only','direct') DEFAULT 'public',
	`isSystem` boolean DEFAULT false,
	`isPublic` boolean DEFAULT false,
	`usageCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mastodon_templates_id` PRIMARY KEY(`id`)
);
