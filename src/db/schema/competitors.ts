import { randomUUID } from "node:crypto";
import { index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { redditPosts } from "./shared";
import { projects } from "./tenant";

/**
 * One Reddit post that named a competitor this project tracks, with what the
 * language model made of it. Per tenant, because the judgement is per project;
 * the post itself stays in the shared table.
 */
export const competitorMentions = pgTable(
  "competitor_mentions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    competitor: text("competitor").notNull(),
    postId: text("post_id")
      .notNull()
      .references(() => redditPosts.id, { onDelete: "cascade" }),
    sentiment: text("sentiment").notNull(),
    summary: text("summary"),
    foundAt: timestamp("found_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("competitor_mentions_project_found_at_idx").on(t.projectId, t.foundAt),
    uniqueIndex("competitor_mentions_project_competitor_post_idx").on(
      t.projectId,
      t.competitor,
      t.postId,
    ),
  ],
);
