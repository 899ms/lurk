-- The quote check and the gates changed after these verdicts were stored, and
-- a verdict is reused only for the profile version it was judged under. Move
-- every project to a new version so the next scan judges its candidates again
-- under the current rules instead of trusting verdicts the old rules produced.
UPDATE "projects" SET "profile_version" = "profile_version" + 1;
