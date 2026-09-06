-- Verdicts stored before two gate rules landed: a comment or post whose body
-- is Reddit's [deleted] / [removed] marker, or whose author is [deleted], is
-- never judged any more, and a verdict with nothing assessed (relationship
-- and need unknown, no fit) is a reject, not a review. Apply both to what is
-- already stored so the held list matches what a fresh scan would show.
DELETE FROM "lead_evaluations" e
USING "reddit_comments" c
WHERE e."comment_id" = c."id"
  AND (c."body" IN ('[deleted]', '[removed]') OR c."author" = '[deleted]');
DELETE FROM "lead_evaluations" e
USING "reddit_posts" p
WHERE e."comment_id" IS NULL AND e."post_id" = p."id"
  AND (p."body" IN ('[deleted]', '[removed]') OR p."author" = '[deleted]');
UPDATE "lead_evaluations"
SET "decision" = 'reject'
WHERE "decision" = 'review'
  AND "relationship" = 'unknown'
  AND "need_state" = 'unknown'
  AND "fit" IS NULL;
