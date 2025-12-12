CREATE TABLE `email_bounces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`user_id` int,
	`bounce_type` enum('soft','hard','complaint','unsubscribe') NOT NULL,
	`bounce_sub_type` varchar(100),
	`diagnostic_code` varchar(500),
	`notification_id` varchar(255),
	`auto_unsubscribed` boolean DEFAULT false,
	`processed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_bounces_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_subject_tests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`template_type` varchar(100) NOT NULL,
	`status` enum('draft','running','completed','cancelled') NOT NULL DEFAULT 'draft',
	`winning_variant_id` int,
	`total_sent` int NOT NULL DEFAULT 0,
	`confidence_level` int DEFAULT 95,
	`min_sample_size` int DEFAULT 100,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`completed_at` timestamp,
	CONSTRAINT `email_subject_tests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_subject_variants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`test_id` int NOT NULL,
	`subject_line` varchar(500) NOT NULL,
	`preview_text` varchar(500),
	`weight` int NOT NULL DEFAULT 50,
	`sent_count` int NOT NULL DEFAULT 0,
	`open_count` int NOT NULL DEFAULT 0,
	`click_count` int NOT NULL DEFAULT 0,
	`open_rate` int DEFAULT 0,
	`is_winner` boolean DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_subject_variants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_suppression_list` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(255) NOT NULL,
	`reason` enum('hard_bounce','complaint','manual','unsubscribe') NOT NULL,
	`bounce_count` int NOT NULL DEFAULT 1,
	`last_bounce_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_suppression_list_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_suppression_list_email_unique` UNIQUE(`email`)
);
