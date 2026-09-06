import { aliasedTable, and, asc, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  leads,
  redditAuthors,
  redditComments,
  redditPosts,
  searchRunPosts,
  subreddits,
  usageLedger,
} from "@/db/schema";

import type { FeedFacets, FeedFilter, LeadCost } from "./feed";

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

/** The feed, best first, for one set of filter pills. */
export async function listLeads(projectId: string, filter: FeedFilter) {
  return feedQuery()
    .where(
      and(
        eq(leads.projectId, projectId),
        eq(leads.status, filter.status),
        gte(redditPosts.createdAt, since(filter.days)),
        filter.subreddit ? eq(sql`lower(${redditPosts.subreddit})`, filter.subreddit) : undefined,
        filter.stage ? eq(leads.stage, filter.stage) : undefined,
      ),
    )
    .orderBy(desc(leads.score), desc(redditPosts.createdAt));
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
