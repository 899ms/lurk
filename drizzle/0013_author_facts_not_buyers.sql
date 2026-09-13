ALTER TABLE "reddit_authors" ADD COLUMN "karma" integer;--> statement-breakpoint
ALTER TABLE "reddit_authors" ADD COLUMN "account_created_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "not_buyers" jsonb;