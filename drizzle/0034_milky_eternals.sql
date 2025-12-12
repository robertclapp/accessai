CREATE TABLE `email_tracking_pixels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analyticsId` int NOT NULL,
	`pixelToken` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`firstOpenedAt` timestamp,
	`lastOpenedAt` timestamp,
	`openCount` int DEFAULT 0,
	CONSTRAINT `email_tracking_pixels_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_tracking_pixels_pixelToken_unique` UNIQUE(`pixelToken`)
);
--> statement-breakpoint
CREATE TABLE `link_tracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analyticsId` int NOT NULL,
	`linkToken` varchar(64) NOT NULL,
	`originalUrl` text NOT NULL,
	`clickCount` int DEFAULT 0,
	`firstClickedAt` timestamp,
	`lastClickedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `link_tracking_id` PRIMARY KEY(`id`),
	CONSTRAINT `link_tracking_linkToken_unique` UNIQUE(`linkToken`)
);
--> statement-breakpoint
CREATE TABLE `notification_analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`notificationType` enum('email','push') NOT NULL,
	`templateType` varchar(50) NOT NULL,
	`recipientId` int,
	`trackingId` varchar(64) NOT NULL,
	`campaignId` varchar(64),
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`deliveredAt` timestamp,
	`openedAt` timestamp,
	`clickedAt` timestamp,
	`openCount` int DEFAULT 0,
	`clickCount` int DEFAULT 0,
	`clickedLinks` json,
	`userAgent` text,
	`ipAddress` varchar(45),
	`deviceType` varchar(20),
	`status` enum('sent','delivered','opened','clicked','bounced','failed') DEFAULT 'sent',
	`errorMessage` text,
	CONSTRAINT `notification_analytics_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_analytics_trackingId_unique` UNIQUE(`trackingId`)
);
--> statement-breakpoint
CREATE TABLE `vapid_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicKey` text NOT NULL,
	`privateKey` text NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`rotatedAt` timestamp,
	`expiresAt` timestamp,
	`createdBy` int,
	CONSTRAINT `vapid_keys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `email_tracking_pixels` ADD CONSTRAINT `email_tracking_pixels_analyticsId_notification_analytics_id_fk` FOREIGN KEY (`analyticsId`) REFERENCES `notification_analytics`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `link_tracking` ADD CONSTRAINT `link_tracking_analyticsId_notification_analytics_id_fk` FOREIGN KEY (`analyticsId`) REFERENCES `notification_analytics`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_analytics` ADD CONSTRAINT `notification_analytics_recipientId_users_id_fk` FOREIGN KEY (`recipientId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vapid_keys` ADD CONSTRAINT `vapid_keys_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;