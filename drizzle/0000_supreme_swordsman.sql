CREATE TABLE `rental_leads` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`fingerprint` text NOT NULL,
	`listing` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rental_leads_owner_idx` ON `rental_leads` (`owner_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `rental_leads_owner_fingerprint_idx` ON `rental_leads` (`owner_id`,`fingerprint`);--> statement-breakpoint
CREATE TABLE `saved_rentals` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`ids` text NOT NULL,
	`updated_at` text NOT NULL
);
