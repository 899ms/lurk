import { aliasedTable, and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  leadEvaluations,
  leads,
  projects,
  redditAuthors,
  redditComments,
  redditPosts,
  searchRunPosts,
  subreddits,
  usageLedger,
} from "@/db/schema";
import { DEFAULT_SCORE_THRESHOLD } from "./scan/constants";

import type { FeedFacets, FeedFilter, LeadCost, ReviewItem } from "./feed";

export type FeedLead = Awaited<ReturnType<typeof listLeads>>[number];

const postAuthors = aliasedTable(redditAuthors, "post_authors");

const feedColumns = {
  id: leads.id,
  score: leads.score,
  fit: leads.fit,
  intent: leads.intent,
  engagement: leads.engagement,
  stage: leads.stage,
  reason: leads.reason,
  matchedPhrase: leads.matchedPhrase,
  status: leads.status,
  postId: leads.postId,
  title: redditPosts.title,
  subreddit: redditPosts.subreddit,
  postAuthor: redditPosts.author,
  postAuthorAvatar: postAuthors.avatarUrl,
  url: redditPosts.url,
  numComments: redditPosts.numComments,
  postScore: redditPosts.score,
  imageUrl: redditPosts.imageUrl,
  createdAt: redditPosts.createdAt,
  body: redditPosts.body,
  subredditIconUrl: subreddits.iconUrl,
  promoPolicy: subreddits.promoPolicy,
  rulesText: subreddits.rulesText,
  commentId: leads.commentId,
  commentPermalink: redditComments.permalink,
  bodyObservedAt: redditPosts.bodyObservedAt,
  commentsObservedAt: redditPosts.commentsObservedAt,
  commentBody: redditComments.body,
  commentAuthor: redditComments.author,
  commentScore: redditComments.score,
  commentCreatedAt: redditComments.createdAt,
  authorAvatar: redditAuthors.avatarUrl,
};

function feedQuery() {
  return db()
    .select(feedColumns)
    .from(leads)
    .innerJoin(redditPosts, eq(redditPosts.id, leads.postId))
    .leftJoin(redditComments, eq(redditComments.id, leads.commentId))
    .leftJoin(subreddits, eq(subreddits.name, sql`lower(${redditPosts.subreddit})`))
    .leftJoin(
      redditAuthors,
      eq(redditAuthors.username, sql`lower(coalesce(${redditComments.author}, ${redditPosts.author}))`),
    )
    .leftJoin(postAuthors, eq(postAuthors.username, sql`lower(${redditPosts.author})`));
}

function since(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/** A comment lead is as old as the comment, never as old as the thread. */
const NEED_AT = sql`coalesce(${redditComments.createdAt}, ${redditPosts.createdAt})`;

/** Postgres wants the bound date as text when the column is a plain expression. */
function newerThan(days: number) {
  return sql`${NEED_AT} >= ${since(days).toISOString()}::timestamptz`;
}

/**
 * The project's own minimum score, applied when the feed is read. Moving it on
 * the Product page changes the next page load, with no rescan and nothing
 * deleted, because the judgement and the user's floor are different facts.
 */
const OVER_THRESHOLD = sql`${leads.score} >= coalesce(${projects.scoreThreshold}, ${DEFAULT_SCORE_THRESHOLD})`;

/** The feed, best first, for one set of filter pills. */
export async function listLeads(projectId: string, filter: FeedFilter) {
  return feedQuery()
    .innerJoin(projects, eq(projects.id, leads.projectId))
    .where(
      and(
        eq(leads.projectId, projectId),
        eq(leads.status, filter.status),
        OVER_THRESHOLD,
        newerThan(filter.days),
        filter.subreddit ? eq(sql`lower(${redditPosts.subreddit})`, filter.subreddit) : undefined,
        filter.stage ? eq(leads.stage, filter.stage) : undefined,
      ),
    )
    .orderBy(desc(leads.score), desc(NEED_AT));
}

/**
 * The candidates the scan held back because the evidence did not settle them.
 * They are not leads and never enter the feed count, but they are the seven or
 * so items per scan that a person can settle in a glance.
 */
export async function listReviewItems(projectId: string, days: number): Promise<ReviewItem[]> {
  const rows = await db()
    .select({
      id: leadEvaluations.id,
      title: redditPosts.title,
      subreddit: redditPosts.subreddit,
      url: sql<string>`coalesce(${redditComments.permalink}, ${redditPosts.url})`,
      author: sql<string | null>`coalesce(${redditComments.author}, ${redditPosts.author})`,
      isComment: sql<boolean>`${leadEvaluations.commentId} is not null`,
      reason: leadEvaluations.reason,
      reasonCodes: leadEvaluations.reasonCodes,
      fit: leadEvaluations.fit,
      intent: leadEvaluations.intent,
      needState: leadEvaluations.needState,
      createdAt: sql<Date>`coalesce(${redditComments.createdAt}, ${redditPosts.createdAt})`,
      judgedAt: leadEvaluations.judgedAt,
    })
    .from(leadEvaluations)
    .innerJoin(redditPosts, eq(redditPosts.id, leadEvaluations.postId))
    .leftJoin(redditComments, eq(redditComments.id, leadEvaluations.commentId))
    .where(
      and(
        eq(leadEvaluations.projectId, projectId),
        eq(leadEvaluations.decision, "review"),
        newerThan(days),
      ),
    )
    .orderBy(desc(leadEvaluations.judgedAt));
  return rows;
}

/** The subreddits and stages this project actually has leads in. */
export async function feedFacets(projectId: string): Promise<FeedFacets> {
  const rows = await db()
    .select({ subreddit: redditPosts.subreddit, stage: leads.stage })
    .from(leads)
    .innerJoin(redditPosts, eq(redditPosts.id, leads.postId))
    .where(eq(leads.projectId, projectId));
  return {
    subreddits: [...new Set(rows.map((row) => row.subreddit))].sort(),
    stages: [...new Set(rows.map((row) => row.stage).filter((stage): stage is string => !!stage))],
  };
}

export async function newLeadCount(projectId: string): Promise<number> {
  const rows = await db()
    .select({ total: count() })
    .from(leads)
    .where(and(eq(leads.projectId, projectId), eq(leads.status, "new")));
  return rows[0]?.total ?? 0;
}

/**
 * What this project paid to have each post in front of it: the first ledger
 * line against a run that produced the post, preferring the paid fetch over the
 * reuse that followed it.
 */
export async function leadCosts(
  projectId: string,
  postIds: string[],
): Promise<Map<string, LeadCost>> {
  if (postIds.length === 0) {
    return new Map();
  }
  const rows = await db()
    .select({
      postId: searchRunPosts.postId,
      sku: usageLedger.sku,
      costUsd: usageLedger.costUsd,
      requestId: usageLedger.requestId,
      reused: usageLedger.reused,
      at: usageLedger.at,
    })
    .from(usageLedger)
    .innerJoin(searchRunPosts, eq(searchRunPosts.searchRunId, usageLedger.searchRunId))
    .where(and(eq(usageLedger.projectId, projectId), inArray(searchRunPosts.postId, postIds)))
    .orderBy(asc(usageLedger.reused), asc(usageLedger.at));
  const byPost = new Map<string, LeadCost>();
  for (const row of rows) {
    if (!byPost.has(row.postId)) {
      byPost.set(row.postId, {
        sku: row.sku,
        costUsd: Number(row.costUsd),
        requestId: row.requestId,
      });
    }
  }
  return byPost;
}

/** Moves a lead out of the feed, recording why when the user says it is a miss. */
export async function setLeadStatus(
  projectId: string,
  leadId: string,
  status: FeedFilter["status"],
  notFitReason: string | null,
): Promise<void> {
  await db()
    .update(leads)
    .set({ status, notFitReason })
    .where(and(eq(leads.id, leadId), eq(leads.projectId, projectId)));
}
