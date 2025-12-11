CREATE TABLE `collection_activity_feed` (
	`id` int AUTO_INCREMENT NOT NULL,
	`collectionId` int NOT NULL,
	`userId` int NOT NULL,
	`userName` varchar(255),
	`actionType` enum('template_added','template_removed','collaborator_invited','collaborator_joined','collaborator_left','collaborator_removed','collection_updated','collection_shared','collection_unshared') NOT NULL,
	`actionDetails` json,
	`message` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `collection_activity_feed_id` PRIMARY KEY(`id`)
);
