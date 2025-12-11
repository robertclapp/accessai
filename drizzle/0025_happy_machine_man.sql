ALTER TABLE `ab_test_templates` ADD `isPublic` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `ab_test_templates` ADD `shareCount` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `ab_test_templates` ADD `copiedFromId` int;--> statement-breakpoint
ALTER TABLE `ab_test_templates` ADD `creatorName` varchar(255);