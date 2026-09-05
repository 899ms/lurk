import { randomUUID } from "node:crypto";
import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { redditComments, redditPosts, searchRuns } from "./shared";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID());

/** Per-tenant judgement. Everything here belongs to one user or one project. */

export const users = pgTable("users", {
  id: id(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const walletConnections = pgTable("wallet_connections", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  refreshToken: text("refresh_token").notNull(),
  accessToken: text("access_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  capUsd: numeric("cap_usd", { precision: 12, scale: 6 }),
  capPeriod: text("cap_period"),
  connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  url: text("url"),
  pain: text("pain"),
  solution: text("solution"),
  targetUsers: text("target_users"),
  geography: text("geography"),
  budgetFit: text("budget_fit"),
  voiceProfile: text("voice_profile"),
  tierSnapshot: text("tier_snapshot"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectKeywords = pgTable(
  "project_keywords",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    keyword: text("keyword").notNull(),
  },
  (t) => [uniqueIndex("project_keywords_project_keyword_idx").on(t.projectId, t.keyword)],
);

export const projectSubreddits = pgTable(
  "project_subreddits",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
  },
  (t) => [uniqueIndex("project_subreddits_project_name_idx").on(t.projectId, t.name)],
);

export const projectCompetitors = pgTable(
  "project_competitors",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
  },
  (t) => [uniqueIndex("project_competitors_project_name_idx").on(t.projectId, t.name)],
);

export const leads = pgTable(
  "leads",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    postId: text("post_id").references(() => redditPosts.id, { onDelete: "cascade" }),
    commentId: text("comment_id").references(() => redditComments.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    stage: text("stage"),
    reason: text("reason"),
    matchedPhrase: text("matched_phrase"),
    sellerSide: boolean("seller_side").notNull().default(false),
    status: text("status").notNull().default("new"),
    notFitReason: text("not_fit_reason"),
    scoredAt: timestamp("scored_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("leads_project_score_idx").on(t.projectId, t.score.desc())],
);

export const drafts = pgTable("drafts", {
  id: id(),
  leadId: text("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  mode: text("mode").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const seoOpportunities = pgTable("seo_opportunities", {
  id: id(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  keyword: text("keyword").notNull(),
  postId: text("post_id").references(() => redditPosts.id, { onDelete: "set null" }),
  position: integer("position"),
  competitorPresent: boolean("competitor_present").notNull().default(false),
  refreshedAt: timestamp("refreshed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const painThemes = pgTable("pain_themes", {
  id: id(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  summary: text("summary"),
  leadIds: text("lead_ids").array(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const alerts = pgTable("alerts", {
  id: id(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(),
  target: text("target").notNull(),
  cadence: text("cadence").notNull(),
  lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
});

export const apiKeys = pgTable("api_keys", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  hash: text("hash").notNull().unique(),
  prefix: text("prefix").notNull(),
  scopes: text("scopes").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
});

export const usageLedger = pgTable(
  "usage_ledger",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    sku: text("sku").notNull(),
    costUsd: numeric("cost_usd", { precision: 12, scale: 6 }).notNull().default("0"),
    requestId: text("request_id"),
    searchRunId: text("search_run_id").references(() => searchRuns.id, { onDelete: "set null" }),
    reused: boolean("reused").notNull().default(false),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("usage_ledger_project_at_idx").on(t.projectId, t.at)],
);

export const jobs = pgTable("jobs", {
  id: id(),
  kind: text("kind").notNull(),
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
  runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  error: text("error"),
});
