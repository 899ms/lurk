-- Leads judged before the 0-4 rubric carry 1-10 values that no longer mean
-- anything under the new labels. Blank them until the next scan re-judges the
-- lead; a lead with an evaluation row was already judged on the new scale.
UPDATE "leads" SET "fit" = NULL, "intent" = NULL, "engagement" = NULL
WHERE NOT EXISTS (
  SELECT 1 FROM "lead_evaluations" e
  WHERE e."project_id" = "leads"."project_id"
    AND (
      ("leads"."comment_id" IS NULL AND e."comment_id" IS NULL AND e."post_id" = "leads"."post_id")
      OR ("leads"."comment_id" IS NOT NULL AND e."comment_id" = "leads"."comment_id")
    )
);
