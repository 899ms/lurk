CREATE TABLE "reddit_authors" (
	"username" text PRIMARY KEY NOT NULL,
	"avatar_url" text,
	"raw" jsonb,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reddit_posts" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "subreddits" ADD COLUMN "icon_url" text;