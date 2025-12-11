ALTER TABLE `digest_ab_tests` ADD `autoCompleteEnabled` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `digest_ab_tests` ADD `minimumSampleSize` int DEFAULT 100;--> statement-breakpoint
ALTER TABLE `digest_ab_tests` ADD `confidenceThreshold` int DEFAULT 95;--> statement-breakpoint
ALTER TABLE `digest_ab_tests` ADD `autoCompletedAt` timestamp;