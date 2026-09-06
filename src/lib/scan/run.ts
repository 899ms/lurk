import { and, count, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { enqueueJob, writeProgress } from "@/jobs/enqueue";
import { clientForUser } from "@/lib/anyapi";
import type { FetchContext } from "@/lib/reddit/fetch";
import {
  fetchAuthorProfile,
  fetchPost,
  fetchSearch,
  fetchSubredditPosts,
} from "@/lib/reddit/skus";
import type { StoredPost } from "@/lib/reddit/store";
import { scanIntervalHours, tierForUser } from "@/lib/tier";
import { RETENTION_DAYS } from "@/lib/tiers";
import { judgeThreads, readThreads } from "./comments";
import { postReadCap } from "./constants";
import { isSentinel } from "./evidence";
import {
  alreadyJudged,
  commentDigests,
  digestComments,
  loadEvaluations,
  postHash,
  writeEvaluations,
  type EvaluationRecord,
  type StoredJudgement,
} from "./evaluations";
import { leadKey, openPostLeads, resolveLeads, writeLeads, type LeadRow } from "./leads";
import { loadScanProject, type ScanProject } from "./project";
import type { Judgement, ScorableItem } from "./judgement";
import { judgeItems, readOrder, triageTitles } from "./score";

const HOUR_MS = 60 * 60 * 1000;
const RETENTION_MS = RETENTION_DAYS * 24 * HOUR_MS;

/** A Reddit avatar changes rarely, so one lookup covers a whole month. */
const AUTHOR_MAX_AGE_MS = 30 * 24 * HOUR_MS;

/** The digest of a post whose thread we have never read. */
const UNREAD_THREAD = digestComments([]);

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
    const result = await fetchSearch(ctx, keyword, { timeframe });
    for (const post of result.value.posts) {
      seen.set(post.id, post);
    }
  }
  for (const subreddit of project.subreddits) {
    const result = await fetchSubredditPosts(ctx, subreddit);
    for (const post of result.value.posts) {
      seen.set(post.id, post);
    }
  }
  return [...seen.values()];
}

function toLead(
  project: ScanProject,
  judgement: Judgement,
  postId: string,
  commentId: string | null,
): LeadRow {
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
 * that; the project's own minimum score is applied when the feed is read, so
 * moving it never has to mean scanning again.
 */
function qualified<T extends { judgement: Judgement }>(items: T[]): T[] {
  return items.filter((item) => item.judgement.decision === "qualify");
}

function postItem(post: StoredPost): ScorableItem {
  return {
    id: post.id,
    title: post.title,
    subreddit: post.subreddit,
    body: post.body ?? "",
    author: post.author,
    ageHours: (Date.now() - post.createdAt.getTime()) / HOUR_MS,
    upvotes: post.score,
    numComments: post.numComments,
    parentBody: null,
  };
}

/**
 * Faces for the feed, bought once a month per author. A failure here is not a
 * failed scan: the card falls back to the author's initials.
 */
async function fetchAvatars(ctx: FetchContext, usernames: string[]): Promise<void> {
  for (const username of new Set(usernames.filter(Boolean))) {
    try {
      await fetchAuthorProfile(ctx, username, AUTHOR_MAX_AGE_MS);
    } catch {
      // An avatar is decoration; the lead is already written.
    }
  }
}

/**
 * The posts this project has no current verdict on, given what it has read. A
 * post Reddit has taken away is dropped here, before a title is triaged or a
 * body is bought: there is nothing left to read and nobody left to answer.
 */
async function unjudged(
  project: ScanProject,
  stored: Map<string, StoredJudgement>,
  posts: StoredPost[],
): Promise<StoredPost[]> {
  const digests = await commentDigests(posts.map((post) => post.id));
  return posts.filter(
    (post) =>
      !isSentinel(post) &&
      !alreadyJudged(
        stored,
        leadKey(post.id, null),
        project.profileVersion,
        postHash(post.title, post.body, digests.get(post.id) ?? UNREAD_THREAD),
      ),
  );
}

async function evaluationsFor(
  project: ScanProject,
  posts: StoredPost[],
  judgements: Judgement[],
): Promise<EvaluationRecord[]> {
  const digests = await commentDigests(posts.map((post) => post.id));
  const byId = new Map(posts.map((post) => [post.id, post]));
  return judgements.map((judgement) => {
    const post = byId.get(judgement.id) as StoredPost;
    return {
      projectId: project.id,
      postId: post.id,
      commentId: null,
      judgement,
      profileVersion: project.profileVersion,
      contentHash: postHash(post.title, post.body, digests.get(post.id) ?? UNREAD_THREAD),
    };
  });
}

/**
 * One scan: list, triage the titles, read the shortlist in full, judge it, and
 * write what qualified. Only then are comment threads bought, for two separate
 * purposes: checking whether each qualified need is still open, and finding the
 * other people in the thread who have a need of their own. Leads are already
 * committed by that point, so a thread we cannot read costs a scan nothing.
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
  const stored = await loadEvaluations(projectId);
  const fresh = (await gatherCandidates(project, ctx, timeframe)).filter(
    (post) => Date.now() - post.createdAt.getTime() <= windowMs,
  );
  const candidates = await unjudged(project, stored, fresh);

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
  const toJudge = await unjudged(project, stored, full);
  const judgements = await judgeItems(projectId, project.productText, toJudge.map(postItem));
  await writeEvaluations(await evaluationsFor(project, toJudge, judgements));
  const scored = judgements.map((judgement) => ({ judgement }));
  const fullById = new Map(toJudge.map((post) => [post.id, post]));
  const postLeads = qualified(scored).map((item) =>
    toLead(project, item.judgement, item.judgement.id, null),
  );
  await writeLeads(postLeads);

  await writeProgress(jobId, "Reading comment threads");
  const threadPosts = await openPostLeads(projectId, limits?.commentThreadsPerScan ?? null);
  const { threads } = await readThreads(ctx, threadPosts);
  const judged = await judgeThreads(project, threads, stored);
  await writeEvaluations(judged.records);
  await resolveLeads(
    projectId,
    judged.verification
      .filter((item) => item.judgement.needState === "resolved")
      .map((item) => item.post.id),
  );
  const commentLeads = qualified(judged.discovery).map((item) =>
    toLead(project, item.judgement, item.postId, item.comment.id),
  );
  const rejudged = qualified(judged.verification).map((item) =>
    toLead(project, item.judgement, item.post.id, null),
  );
  await writeLeads([...rejudged, ...commentLeads]);
  const committed = new Set(
    [...postLeads, ...rejudged, ...commentLeads].map((lead) =>
      leadKey(lead.postId, lead.commentId),
    ),
  );

  await writeProgress(jobId, "Looking up who posted");
  await fetchAvatars(ctx, [
    ...postLeads.map((lead) => fullById.get(lead.postId)?.author ?? ""),
    ...qualified(judged.discovery).map((item) => item.comment.author ?? ""),
  ]);

  await writeProgress(jobId, "Finished");
  await enqueueJob("scan", projectId, new Date(Date.now() + scanIntervalHours(limits) * HOUR_MS));
  return { candidates: candidates.length, read: full.length, leads: committed.size };
}
