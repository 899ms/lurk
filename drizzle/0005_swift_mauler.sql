CREATE TABLE "lead_evaluations" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"post_id" text NOT NULL,
	"comment_id" text,
	"decision" text NOT NULL,
	"relationship" text NOT NULL,
	"need_state" text NOT NULL,
	"fit" integer,
	"intent" integer,
	"engagement" integer NOT NULL,
	"score" integer NOT NULL,
	"reason_codes" text[] NOT NULL,
	"requirements" jsonb NOT NULL,
	"answer_coverage" text NOT NULL,
	"evidence_quote" text,
	"reason" text NOT NULL,
	"profile_version" integer NOT NULL,
	"content_hash" text NOT NULL,
	"scorer_version" text NOT NULL,
	"judged_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reddit_comments" ADD COLUMN "permalink" text;--> statement-breakpoint
ALTER TABLE "reddit_posts" ADD COLUMN "body_observed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reddit_posts" ADD COLUMN "comments_observed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "profile_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "usage_ledger" ADD COLUMN "funded_by" text DEFAULT 'house' NOT NULL;--> statement-breakpoint
ALTER TABLE "lead_evaluations" ADD CONSTRAINT "lead_evaluations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_evaluations" ADD CONSTRAINT "lead_evaluations_post_id_reddit_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."reddit_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_evaluations" ADD CONSTRAINT "lead_evaluations_comment_id_reddit_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."reddit_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lead_evaluations_project_post_idx" ON "lead_evaluations" USING btree ("project_id","post_id") WHERE "lead_evaluations"."comment_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "lead_evaluations_project_comment_idx" ON "lead_evaluations" USING btree ("project_id","comment_id") WHERE "lead_evaluations"."comment_id" is not null;--> statement-breakpoint
CREATE INDEX "lead_evaluations_project_decision_idx" ON "lead_evaluations" USING btree ("project_id","decision");