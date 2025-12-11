CREATE TABLE `template_analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`eventType` varchar(50) NOT NULL,
	`userId` int,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `template_analytics_id` PRIMARY KEY(`id`)
);
