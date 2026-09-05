import { and, asc, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  leads,
  redditComments,
  redditPosts,
  searchRunPosts,
  subreddits,
  usageLedger,
} from "@/db/schema";
import { normalizeQuery } from "./reddit/fetch";

export type LeadStatus = "new" | "hidden" | "not_fit";

export type FeedLead = {
  id: string;
  score: number;
  fit: number | null;
  intent: number | null;
  engagement: number | null;
  stage: string | null;
  reason: string | null;
  matchedPhrase: string | null;
  status: string;
  title: string;
  subreddit: string;
  author: string | null;
  url: string;
  numComments: number | null;
  createdAt: Date;
  body: string | null;
  commentId: string | null;
  commentBody: string | null;
  commentAuthor: string | null;
};

export type LeadCost = { sku: string; costUsd: number; requestId: string | null } | null;

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
  title: redditPosts.title,
  subreddit: redditPosts.subreddit,
  author: redditPosts.author,
  url: redditPosts.url,
  numComments: redditPosts.numComments,
  createdAt: redditPosts.createdAt,
  body: redditPosts.body,
  commentId: leads.commentId,
  commentBody: redditComments.body,
  commentAuthor: redditComments.author,
};

/** The feed, best first, for one status tab. */
export async function listLeads(projectId: string, status: LeadStatus): Promise<FeedLead[]> {
  return db()
    .select(feedColumns)
    .from(leads)
    .innerJoin(redditPosts, eq(redditPosts.id, leads.postId))
    .leftJoin(redditComments, eq(redditComments.id, leads.commentId))
    .where(and(eq(leads.projectId, projectId), eq(leads.status, status)))
    .orderBy(desc(leads.score), desc(redditPosts.createdAt));
}

export async function newLeadCount(projectId: string): Promise<number> {
  const rows = await db()
    .select({ total: count() })
    .from(leads)
    .where(and(eq(leads.projectId, projectId), eq(leads.status, "new")));
  return rows[0]?.total ?? 0;
}

/** The subreddit's own self-promotion rule, as one sentence and its sidebar. */
export async function subredditPolicy(name: string) {
  const rows = await db()
    .select()
    .from(subreddits)
    .where(eq(subreddits.name, normalizeQuery(name)));
  return rows[0] ?? null;
}

/**
 * What this project paid to have the lead's post in front of it. The first
 * ledger line against a run that produced the post, preferring a paid fetch
 * over the reuse that followed it.
 */
export async function leadCost(projectId: string, postId: string): Promise<LeadCost> {
  const rows = await db()
    .select({
      sku: usageLedger.sku,
      costUsd: usageLedger.costUsd,
      requestId: usageLedger.requestId,
    })
    .from(usageLedger)
    .innerJoin(searchRunPosts, eq(searchRunPosts.searchRunId, usageLedger.searchRunId))
    .where(and(eq(usageLedger.projectId, projectId), eq(searchRunPosts.postId, postId)))
    .orderBy(asc(usageLedger.reused), asc(usageLedger.at))
    .limit(1);
  const row = rows[0];
  return row ? { sku: row.sku, costUsd: Number(row.costUsd), requestId: row.requestId } : null;
}

/** Moves a lead out of the feed, recording why when the user says it is a miss. */
export async function setLeadStatus(
  projectId: string,
  leadId: string,
  status: LeadStatus,
  notFitReason: string | null,
): Promise<void> {
  await db()
    .update(leads)
    .set({ status, notFitReason })
    .where(and(eq(leads.id, leadId), eq(leads.projectId, projectId)));
}
