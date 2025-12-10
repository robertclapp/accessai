CREATE TABLE `ab_test_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(100) NOT NULL,
	`isSystem` boolean DEFAULT false,
	`userId` int,
	`platforms` json,
	`variantATemplate` text NOT NULL,
	`variantALabel` varchar(100) DEFAULT 'Variant A',
	`variantBTemplate` text NOT NULL,
	`variantBLabel` varchar(100) DEFAULT 'Variant B',
	`exampleUseCase` text,
	`tags` json,
	`usageCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ab_test_templates_id` PRIMARY KEY(`id`)
);
