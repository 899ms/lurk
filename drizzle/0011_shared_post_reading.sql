CREATE TABLE "post_readings" (
	"post_id" text PRIMARY KEY NOT NULL,
	"speaker" text NOT NULL,
	"asking" boolean NOT NULL,
	"need" text NOT NULL,
	"category" text NOT NULL,
	"constraints" jsonb NOT NULL,
	"content_hash" text NOT NULL,
	"reading_version" text NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "post_readings" ADD CONSTRAINT "post_readings_post_id_reddit_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."reddit_posts"("id") ON DELETE cascade ON UPDATE no action;