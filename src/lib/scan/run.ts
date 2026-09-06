import { and, count, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { enqueueJob, writeProgress } from "@/jobs/enqueue";
import { clientForUser } from "@/lib/anyapi";
import type { FetchContext } from "@/lib/reddit/fetch";
import {
  fetchAuthorProfile,
  fetchPost,
  fetchPostComments,
  fetchSearch,
  fetchSubredditPosts,
} from "@/lib/reddit/skus";
import type { StoredPost } from "@/lib/reddit/store";
import { scanIntervalHours, tierForUser } from "@/lib/tier";
import { RETENTION_DAYS } from "@/lib/tiers";
import { MIN_COMMENTS_FOR_THREAD, postReadCap } from "./constants";
import { knownLeadKeys, leadKey, withoutKnownLeads, writeLeads, type LeadRow } from "./leads";
import { loadScanProject, type ScanProject } from "./project";
import type { Judgement, ScorableItem } from "./judgement";
import { judgeItems, readOrder, triageTitles } from "./score";

const HOUR_MS = 60 * 60 * 1000;
const RETENTION_MS = RETENTION_DAYS * 24 * HOUR_MS;

/** A Reddit avatar changes rarely, so one lookup covers a whole month. */
const AUTHOR_MAX_AGE_MS = 30 * 24 * HOUR_MS;

export type ScanOutcome = { candidates: number; read: number; leads: number };

async function isFirstScan(projectId: string): Promise<boolean> {
  const rows = await db()
    .select({ total: count() })
    .from(jobs)
    .where(and(eq(jobs.kind, "scan"), eq(jobs.projectId, projectId), isNotNull(jobs.finishedAt)));
  return (rows[0]?.total ?? 0) === 0;
}

async function gatherCandidates(
  project: ScanProject,
  ctx: FetchContext,
  timeframe: "day" | "week",
): Promise<StoredPost[]> {
  const seen = new Map<string, StoredPost>();
  for (const keyword of project.keywords) {
    const result = await fetchSearch(ctx, keyword, timeframe);
    for (const post of result.value) {
      seen.set(post.id, post);
    }
  }
  for (const subreddit of project.subreddits) {
    const result = await fetchSubredditPosts(ctx, subreddit);
    for (const post of result.value) {
      seen.set(post.id, post);
    }
  }
  return [...seen.values()];
}

function toLead(project: ScanProject, judgement: Judgement, postId: string, commentId: string | null): LeadRow {
  return {
    projectId: project.id,
    postId,
    commentId,
    score: judgement.score,
    fit: judgement.fit,
    intent: judgement.intent,
    engagement: judgement.engagement,
    stage: judgement.stage,
    reason: judgement.reason,
    matchedPhrase: judgement.matchedPhrase,
  };
}

/**
 * Only a qualified judgement reaches the feed. The gates in gates.ts settled
 * that; the project threshold is the user's own extra floor on top of it.
 */
function keepers(project: ScanProject, judgements: Judgement[]): Judgement[] {
  return judgements.filter((item) => item.decision === "qualify" && item.score >= project.threshold);
}

async function scanComments(
  project: ScanProject,
  ctx: FetchContext,
  posts: StoredPost[],
  threadBudget: number | null,
  known: Set<string>,
): Promise<{ rows: LeadRow[]; authors: string[] }> {
  const threads = posts
    .filter((post) => (post.numComments ?? 0) >= MIN_COMMENTS_FOR_THREAD)
    .slice(0, threadBudget ?? posts.length);
  const items: ScorableItem[] = [];
  const parentOf = new Map<string, string>();
  const authorOf = new Map<string, string | null>();
  for (const post of threads) {
    const result = await fetchPostComments(ctx, post.id, post.url);
    for (const comment of result.value) {
      if (known.has(leadKey(post.id, comment.id))) {
        continue;
      }
      parentOf.set(comment.id, post.id);
      authorOf.set(comment.id, comment.author);
      items.push({
        id: comment.id,
        title: post.title,
        subreddit: post.subreddit,
        body: comment.body ?? "",
        author: comment.author,
        ageHours: (Date.now() - comment.createdAt.getTime()) / HOUR_MS,
        upvotes: comment.score,
        numComments: post.numComments,
        parentBody: post.body ?? "",
      });
    }
  }
  if (items.length === 0) {
    return { rows: [], authors: [] };
  }
  const judgements = await judgeItems(project.id, project.productText, items);
  const kept = keepers(project, judgements).filter((item) => parentOf.has(item.id));
  return {
    rows: kept.map((item) => toLead(project, item, parentOf.get(item.id) as string, item.id)),
    authors: kept.map((item) => authorOf.get(item.id) ?? "").filter(Boolean),
  };
}

/**
 * Faces for the feed, bought once a month per author. A failure here is not a
 * failed scan: the card falls back to the author's initials.
 */
async function fetchAvatars(ctx: FetchContext, usernames: string[]): Promise<void> {
  for (const username of new Set(usernames)) {
    try {
      await fetchAuthorProfile(ctx, username, AUTHOR_MAX_AGE_MS);
    } catch {
      // An avatar is decoration; the lead is already written.
    }
  }
}

/**
 * One scan: list, triage the titles, read the shortlist in full, judge, then
 * buy comments only for the threads worth replying in.
 */
export async function runScan(projectId: string, jobId: string): Promise<ScanOutcome> {
  const project = await loadScanProject(projectId);
  if (!project) {
    throw new Error("This project no longer exists");
  }
  const { name: tier, limits } = await tierForUser(project.userId);
  const funded = await clientForUser(project.userId);
  const ctx: FetchContext = {
    projectId,
    funded,
    maxAgeMs: scanIntervalHours(limits) * HOUR_MS,
  };
  const windowMs = (limits?.feedWindowDays ?? RETENTION_DAYS) * 24 * HOUR_MS;
  const timeframe = (await isFirstScan(projectId)) ? "week" : "day";

  await writeProgress(jobId, "Looking for new posts");
  const known = await knownLeadKeys(projectId);
  const fresh = (await gatherCandidates(project, ctx, timeframe)).filter(
    (post) => Date.now() - post.createdAt.getTime() <= windowMs,
  );
  const candidates = withoutKnownLeads(
    known,
    fresh.map((post) => ({ postId: post.id, post })),
  ).map((entry) => entry.post);

  await writeProgress(jobId, `Reading ${candidates.length} titles`);
  const triage = await triageTitles(
    projectId,
    project.productText,
    candidates.map((post) => ({
      id: post.id,
      title: post.title,
      subreddit: post.subreddit,
      author: post.author,
      score: post.score,
      ageHours: (Date.now() - post.createdAt.getTime()) / HOUR_MS,
    })),
  );
  const cap = postReadCap(limits, tier);
  const byId = new Map(candidates.map((post) => [post.id, post]));
  const shortlist = readOrder(triage)
    .map((id) => byId.get(id))
    .filter((post): post is StoredPost => post !== undefined)
    .slice(0, cap ?? candidates.length);

  await writeProgress(jobId, `Opening ${shortlist.length} posts`);
  const full: StoredPost[] = [];
  for (const post of shortlist) {
    const result = await fetchPost(ctx, post.url, RETENTION_MS);
    full.push(result.value[0] ?? post);
  }

  await writeProgress(jobId, `Scoring ${full.length} posts`);
  const judgements = await judgeItems(
    projectId,
    project.productText,
    full.map((post) => ({
      id: post.id,
      title: post.title,
      subreddit: post.subreddit,
      body: post.body ?? "",
      author: post.author,
      ageHours: (Date.now() - post.createdAt.getTime()) / HOUR_MS,
      upvotes: post.score,
      numComments: post.numComments,
      parentBody: null,
    })),
  );
  const postLeads = keepers(project, judgements).map((item) => toLead(project, item, item.id, null));

  await writeProgress(jobId, "Reading comment threads");
  const byScore = [...postLeads].sort((a, b) => b.score - a.score);
  const threadPosts = byScore
    .map((lead) => full.find((post) => post.id === lead.postId))
    .filter((post): post is StoredPost => post !== undefined);
  const commentLeads = await scanComments(
    project,
    ctx,
    threadPosts,
    limits?.commentThreadsPerScan ?? null,
    known,
  );

  const written = await writeLeads([...postLeads, ...commentLeads.rows]);

  await writeProgress(jobId, "Looking up who posted");
  const postAuthors = postLeads
    .map((lead) => full.find((post) => post.id === lead.postId)?.author ?? "")
    .filter(Boolean);
  await fetchAvatars(ctx, [...postAuthors, ...commentLeads.authors]);

  await writeProgress(jobId, "Finished");
  await enqueueJob("scan", projectId, new Date(Date.now() + scanIntervalHours(limits) * HOUR_MS));
  return { candidates: candidates.length, read: full.length, leads: written };
}
