import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, isNull } from "drizzle-orm";
import { db } from "@/db";
import { searchRuns, subreddits, usageLedger } from "@/db/schema";
import type { FundedClient } from "@/lib/anyapi";
import {
  commentsOfPost,
  linkRunPosts,
  postsOfRun,
  upsertComments,
  upsertPosts,
  type RawComment,
  type RawPost,
  type StoredComment,
  type StoredPost,
} from "./store";

/** One search_runs row per kind of thing we ask Reddit for. */
export type FetchKind = "keyword" | "subreddit_posts" | "post" | "comments" | "subreddit";

export type FetchContext = { projectId: string; funded: FundedClient; maxAgeMs: number };

type StoredRun = typeof searchRuns.$inferSelect;

type SharedFetch<T> = {
  ctx: FetchContext;
  kind: FetchKind;
  sku: string;
  normalizedQuery: string;
  sort?: string | null;
  timeframe?: string | null;
  maxAgeMs?: number;
  run: () => Promise<{ data: unknown; costUsd: number }>;
  store: (data: unknown, runId: string) => Promise<T>;
  load: (runId: string) => Promise<T>;
};

export type SharedResult<T> = { value: T; reused: boolean; costUsd: number };

/** A stored run may serve the caller when it is younger than their cadence. */
export function isFreshEnough(fetchedAt: Date, maxAgeMs: number, now = new Date()): boolean {
  return now.getTime() - fetchedAt.getTime() <= maxAgeMs;
}

async function findRun(
  kind: FetchKind,
  normalizedQuery: string,
  sort: string | null,
  timeframe: string | null,
  maxAgeMs: number,
): Promise<StoredRun | null> {
  const rows = await db()
    .select()
    .from(searchRuns)
    .where(
      and(
        eq(searchRuns.kind, kind),
        eq(searchRuns.normalizedQuery, normalizedQuery),
        sort === null ? isNull(searchRuns.sort) : eq(searchRuns.sort, sort),
        timeframe === null ? isNull(searchRuns.timeframe) : eq(searchRuns.timeframe, timeframe),
        gte(searchRuns.fetchedAt, new Date(Date.now() - maxAgeMs)),
      ),
    )
    .orderBy(desc(searchRuns.fetchedAt))
    .limit(1);
  return rows[0] ?? null;
}

/** One usage_ledger line. Exported so a non-shared call can record itself too. */
export async function recordUsage(input: {
  projectId: string;
  sku: string;
  costUsd: number;
  requestId: string | null;
  searchRunId: string | null;
  reused: boolean;
}) {
  await db().insert(usageLedger).values({
    projectId: input.projectId,
    sku: input.sku,
    costUsd: input.costUsd.toFixed(6),
    requestId: input.requestId,
    searchRunId: input.searchRunId,
    reused: input.reused,
  });
}

/**
 * The one place a Reddit fetch happens. A run inside the caller's cadence
 * window is reused and billed at zero; otherwise we call AnyAPI, store the run,
 * and attribute its cost to the project that asked. A thrown SDK error writes
 * no run and no ledger line, so a failed scan never looks like a paid one.
 */
export async function fetchShared<T>(input: SharedFetch<T>): Promise<SharedResult<T>> {
  const { ctx, kind, sku, normalizedQuery } = input;
  const sort = input.sort ?? null;
  const timeframe = input.timeframe ?? null;
  const maxAgeMs = input.maxAgeMs ?? ctx.maxAgeMs;

  const existing = await findRun(kind, normalizedQuery, sort, timeframe, maxAgeMs);
  if (existing) {
    const value = await input.load(existing.id);
    await recordUsage({
      projectId: ctx.projectId,
      sku,
      costUsd: 0,
      requestId: existing.requestId,
      searchRunId: existing.id,
      reused: true,
    });
    return { value, reused: true, costUsd: 0 };
  }

  const result = await input.run();
  const runId = randomUUID();
  await db().insert(searchRuns).values({
    id: runId,
    kind,
    normalizedQuery,
    sort,
    timeframe,
    costUsd: result.costUsd.toFixed(6),
    requestId: ctx.funded.lastRequestId(),
    fundedBy: ctx.funded.funding,
  });
  const value = await input.store(result.data, runId);
  await recordUsage({
    projectId: ctx.projectId,
    sku,
    costUsd: result.costUsd,
    requestId: ctx.funded.lastRequestId(),
    searchRunId: runId,
    reused: false,
  });
  return { value, reused: false, costUsd: result.costUsd };
}

function storePosts(data: unknown, runId: string): Promise<StoredPost[]> {
  const posts = ((data as { posts?: RawPost[] } | null)?.posts ?? []) as RawPost[];
  return upsertPosts(posts).then(async (stored) => {
    await linkRunPosts(
      runId,
      stored.map((post) => post.id),
    );
    return stored;
  });
}

export function normalizeQuery(value: string): string {
  return value.trim().toLowerCase();
}

export async function fetchSearch(
  ctx: FetchContext,
  query: string,
  timeframe: "day" | "week",
): Promise<SharedResult<StoredPost[]>> {
  return fetchShared<StoredPost[]>({
    ctx,
    kind: "keyword",
    sku: "reddit.search",
    normalizedQuery: normalizeQuery(query),
    sort: "new",
    timeframe,
    run: async () => {
      const res = await ctx.funded.client.reddit.search({ query, sort: "new", timeframe });
      return { data: res.output.found ? res.output.data : null, costUsd: res.costUsd };
    },
    store: storePosts,
    load: postsOfRun,
  });
}

export async function fetchSubredditPosts(
  ctx: FetchContext,
  subreddit: string,
): Promise<SharedResult<StoredPost[]>> {
  return fetchShared<StoredPost[]>({
    ctx,
    kind: "subreddit_posts",
    sku: "reddit.subreddit_posts",
    normalizedQuery: normalizeQuery(subreddit),
    sort: "new",
    run: async () => {
      const res = await ctx.funded.client.reddit.subredditPosts({ subreddit, sort: "new" });
      return { data: res.output.found ? res.output.data : null, costUsd: res.costUsd };
    },
    store: storePosts,
    load: postsOfRun,
  });
}

export async function fetchPost(
  ctx: FetchContext,
  url: string,
  maxAgeMs: number,
): Promise<SharedResult<StoredPost[]>> {
  return fetchShared<StoredPost[]>({
    ctx,
    kind: "post",
    sku: "reddit.post",
    normalizedQuery: url,
    maxAgeMs,
    run: async () => {
      const res = await ctx.funded.client.reddit.post({ url });
      return { data: res.output.found ? { posts: [res.output.data] } : null, costUsd: res.costUsd };
    },
    store: storePosts,
    load: postsOfRun,
  });
}

export async function fetchPostComments(
  ctx: FetchContext,
  postId: string,
  url: string,
): Promise<SharedResult<StoredComment[]>> {
  return fetchShared<StoredComment[]>({
    ctx,
    kind: "comments",
    sku: "reddit.post_comments",
    normalizedQuery: postId,
    run: async () => {
      const res = await ctx.funded.client.reddit.postComments({ url });
      return { data: res.output.found ? res.output.data : null, costUsd: res.costUsd };
    },
    store: async (data) => {
      const comments = ((data as { comments?: RawComment[] } | null)?.comments ?? []) as RawComment[];
      return upsertComments(postId, comments);
    },
    load: async () => commentsOfPost(postId),
  });
}

export type SubredditFacts = { name: string; weeklyActiveUsers: number; description: string } | null;

/** Subreddit metadata, kept for a week because a sidebar rarely changes. */
export async function fetchSubredditDetails(
  ctx: FetchContext,
  subreddit: string,
  maxAgeMs: number,
): Promise<SharedResult<SubredditFacts>> {
  return fetchShared<SubredditFacts>({
    ctx,
    kind: "subreddit",
    sku: "reddit.subreddit_details",
    normalizedQuery: normalizeQuery(subreddit),
    maxAgeMs,
    run: async () => {
      const res = await ctx.funded.client.reddit.subredditDetails({ subreddit });
      return { data: res.output.found ? res.output.data : null, costUsd: res.costUsd };
    },
    store: async (data) => {
      const facts = data as SubredditFacts;
      if (!facts) {
        return null;
      }
      await db()
        .insert(subreddits)
        .values({
          name: normalizeQuery(subreddit),
          subscribers: facts.weeklyActiveUsers,
          rulesText: facts.description,
          fetchedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: subreddits.name,
          set: {
            subscribers: facts.weeklyActiveUsers,
            rulesText: facts.description,
            fetchedAt: new Date(),
          },
        });
      return facts;
    },
    load: async () => {
      const rows = await db()
        .select()
        .from(subreddits)
        .where(eq(subreddits.name, normalizeQuery(subreddit)));
      const row = rows[0];
      return row
        ? { name: row.name, weeklyActiveUsers: row.subscribers ?? 0, description: row.rulesText ?? "" }
        : null;
    },
  });
}
