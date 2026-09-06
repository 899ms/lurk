CREATE TABLE "competitor_mentions" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"competitor" text NOT NULL,
	"post_id" text NOT NULL,
	"sentiment" text NOT NULL,
	"summary" text,
	"found_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "competitor_mentions" ADD CONSTRAINT "competitor_mentions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_mentions" ADD CONSTRAINT "competitor_mentions_post_id_reddit_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."reddit_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "competitor_mentions_project_found_at_idx" ON "competitor_mentions" USING btree ("project_id","found_at");--> statement-breakpoint
CREATE UNIQUE INDEX "competitor_mentions_project_competitor_post_idx" ON "competitor_mentions" USING btree ("project_id","competitor","post_id");
