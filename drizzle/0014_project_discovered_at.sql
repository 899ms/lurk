ALTER TABLE "projects" ADD COLUMN "discovered_at" timestamp with time zone;--> statement-breakpoint
-- Every project that already carries a plan was set up by the old path, which
-- ran discovery inside the request that created it. Without this they would all
-- look unfinished on the next boot and be discovered again, at a cost, instead
-- of being scanned. A project with no plan row never got one, so it is left
-- null and the initial discovery picks it up.
UPDATE "projects" SET "discovered_at" = "created_at" WHERE EXISTS (
  SELECT 1 FROM "project_subreddits" WHERE "project_subreddits"."project_id" = "projects"."id"
) OR EXISTS (
  SELECT 1 FROM "project_keywords" WHERE "project_keywords"."project_id" = "projects"."id"
);
