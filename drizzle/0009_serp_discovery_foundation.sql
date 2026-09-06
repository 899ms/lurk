CREATE TABLE "candidate_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"post_id" text NOT NULL,
	"source_kind" text NOT NULL,
	"source_key" text NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discovery_evidence" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"post_id" text NOT NULL,
	"canonical_url" text NOT NULL,
	"subreddit" text NOT NULL,
	"query" text NOT NULL,
	"family" text,
	"destination" text,
	"position" integer,
	"title" text,
	"snippet" text,
	"relevance" text NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- A run already stored knows only its kind, and every kind was bought from
-- exactly one AnyAPI endpoint, so the SKU is recoverable before the column
-- can be made required.
ALTER TABLE "search_runs" ADD COLUMN "sku" text;--> statement-breakpoint
UPDATE "search_runs" SET "sku" = CASE "kind"
	WHEN 'keyword' THEN 'reddit.search'
	WHEN 'subreddit_posts' THEN 'reddit.subreddit_posts'
	WHEN 'post' THEN 'reddit.post'
	WHEN 'comments' THEN 'reddit.post_comments'
	WHEN 'subreddit' THEN 'reddit.subreddit_details'
	WHEN 'profile' THEN 'reddit.profile'
	WHEN 'serp' THEN 'google.search'
	ELSE "kind"
END WHERE "sku" IS NULL;--> statement-breakpoint
ALTER TABLE "search_runs" ALTER COLUMN "sku" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "search_runs" ADD COLUMN "variant" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "search_runs" ADD COLUMN "next_cursor" text;--> statement-breakpoint
ALTER TABLE "project_competitors" ADD COLUMN "role" text;--> statement-breakpoint
ALTER TABLE "project_competitors" ADD COLUMN "source" text DEFAULT 'llm' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_competitors" ADD COLUMN "state" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_competitors" ADD COLUMN "evidence" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "project_competitors" ADD COLUMN "last_covered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "project_competitors" ADD COLUMN "fresh_candidates" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "project_competitors" ADD COLUMN "fresh_leads" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "project_keywords" ADD COLUMN "source" text DEFAULT 'llm' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_keywords" ADD COLUMN "state" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_keywords" ADD COLUMN "evidence" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "project_keywords" ADD COLUMN "last_covered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "project_keywords" ADD COLUMN "fresh_candidates" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "project_keywords" ADD COLUMN "fresh_leads" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "project_subreddits" ADD COLUMN "source" text DEFAULT 'llm' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_subreddits" ADD COLUMN "state" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_subreddits" ADD COLUMN "evidence" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "project_subreddits" ADD COLUMN "last_covered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "project_subreddits" ADD COLUMN "fresh_candidates" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "project_subreddits" ADD COLUMN "fresh_leads" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "discovery_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "destinations" jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "problem_phrasings" jsonb;--> statement-breakpoint
ALTER TABLE "candidate_sources" ADD CONSTRAINT "candidate_sources_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_sources" ADD CONSTRAINT "candidate_sources_post_id_reddit_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."reddit_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_evidence" ADD CONSTRAINT "discovery_evidence_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "candidate_sources_project_post_source_idx" ON "candidate_sources" USING btree ("project_id","post_id","source_kind","source_key");--> statement-breakpoint
CREATE UNIQUE INDEX "discovery_evidence_project_post_query_idx" ON "discovery_evidence" USING btree ("project_id","post_id","query");--> statement-breakpoint
CREATE INDEX "discovery_evidence_project_subreddit_idx" ON "discovery_evidence" USING btree ("project_id","subreddit");