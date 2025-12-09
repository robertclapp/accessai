ALTER TABLE `users` ADD `hasCompletedTour` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `tourCompletedAt` timestamp;