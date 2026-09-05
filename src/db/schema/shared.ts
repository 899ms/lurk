import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Reddit and Google facts. Stored once for every tenant, keyed by the upstream
 * identity, so two projects tracking the same query pay for one fetch.
 */

export const redditPosts = pgTable(
  "reddit_posts",
  {
    id: text("id").primaryKey(),
    subreddit: text("subreddit").notNull(),
    author: text("author"),
    title: text("title").notNull(),
    body: text("body"),
    url: text("url").notNull(),
    score: integer("score"),
    numComments: integer("num_comments"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    raw: jsonb("raw"),
  },
  (t) => [index("reddit_posts_subreddit_created_at_idx").on(t.subreddit, t.createdAt)],
);

export const redditComments = pgTable("reddit_comments", {
  id: text("id").primaryKey(),
  postId: text("post_id")
    .notNull()
    .references(() => redditPosts.id, { onDelete: "cascade" }),
  parentId: text("parent_id"),
  author: text("author"),
  body: text("body"),
  score: integer("score"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  raw: jsonb("raw"),
});

export const subreddits = pgTable("subreddits", {
  name: text("name").primaryKey(),
  subscribers: integer("subscribers"),
  rulesText: text("rules_text"),
  promoPolicy: text("promo_policy"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});

export const searchRuns = pgTable(
  "search_runs",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    normalizedQuery: text("normalized_query").notNull(),
    sort: text("sort"),
    timeframe: text("timeframe"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    costUsd: numeric("cost_usd", { precision: 12, scale: 6 }),
    requestId: text("request_id"),
    fundedBy: text("funded_by").notNull(),
  },
  (t) => [index("search_runs_kind_query_fetched_at_idx").on(t.kind, t.normalizedQuery, t.fetchedAt)],
);

export const serpResults = pgTable("serp_results", {
  id: text("id").primaryKey(),
  searchRunId: text("search_run_id")
    .notNull()
    .references(() => searchRuns.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  url: text("url").notNull(),
  title: text("title"),
  snippet: text("snippet"),
});

export const keywordVolumes = pgTable("keyword_volumes", {
  id: text("id").primaryKey(),
  keyword: text("keyword").notNull(),
  geo: text("geo"),
  monthlyVolume: integer("monthly_volume"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Which posts one run returned, so a reused run can hand back exactly the rows
 * it produced instead of guessing from the shared post table.
 */
export const searchRunPosts = pgTable(
  "search_run_posts",
  {
    searchRunId: text("search_run_id")
      .notNull()
      .references(() => searchRuns.id, { onDelete: "cascade" }),
    postId: text("post_id")
      .notNull()
      .references(() => redditPosts.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.searchRunId, t.postId] })],
);
