CREATE TABLE "search_run_posts" (
	"search_run_id" text NOT NULL,
	"post_id" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "search_run_posts_search_run_id_post_id_pk" PRIMARY KEY("search_run_id","post_id")
);
--> statement-breakpoint
CREATE TABLE "llm_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text,
	"purpose" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cost_usd" numeric(12, 6) DEFAULT '0' NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "progress" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "fit" integer;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "intent" integer;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "engagement" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "score_threshold" integer;--> statement-breakpoint
ALTER TABLE "search_run_posts" ADD CONSTRAINT "search_run_posts_search_run_id_search_runs_id_fk" FOREIGN KEY ("search_run_id") REFERENCES "public"."search_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_run_posts" ADD CONSTRAINT "search_run_posts_post_id_reddit_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."reddit_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_usage" ADD CONSTRAINT "llm_usage_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "llm_usage_at_idx" ON "llm_usage" USING btree ("at");