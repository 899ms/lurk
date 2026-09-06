import { eq } from "drizzle-orm";
import { db } from "@/db";
import { redditAuthors, subreddits } from "@/db/schema";
import {
  fetchShared,
  normalizeQuery,
  type FetchContext,
  type SharedResult,
} from "./fetch";
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

/** One function per Reddit endpoint the scan uses, all sharing one run store. */

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

/**
 * Keyword search is sorted by relevance, not by new. Measured on 2026-09-05:
 * "Typeform alternatives" over one week returned 1 unrelated post sorted new
 * and 7 on-topic ones sorted by relevance, so newest-first threw the leads away
 * and left the title prefilter nothing to keep. The timeframe already bounds
 * how old a result can be.
 */
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
    sort: "relevance",
    timeframe,
    run: async () => {
      const res = await ctx.funded.client.reddit.search({ query, sort: "relevance", timeframe });
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

export type SubredditFacts = {
  name: string;
  weeklyActiveUsers: number;
  description: string;
  iconUrl?: string;
} | null;

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
          iconUrl: facts.iconUrl ?? null,
          fetchedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: subreddits.name,
          set: {
            subscribers: facts.weeklyActiveUsers,
            rulesText: facts.description,
            iconUrl: facts.iconUrl ?? null,
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
        ? {
            name: row.name,
            weeklyActiveUsers: row.subscribers ?? 0,
            description: row.rulesText ?? "",
            iconUrl: row.iconUrl ?? undefined,
          }
        : null;
    },
  });
}

export type AuthorFace = { username: string; avatarUrl: string | null } | null;

/**
 * One Reddit account's avatar, kept a month. Called only for authors whose post
 * already became a lead, so the cost follows leads and not candidates.
 */
export async function fetchAuthorProfile(
  ctx: FetchContext,
  username: string,
  maxAgeMs: number,
): Promise<SharedResult<AuthorFace>> {
  const key = normalizeQuery(username);
  return fetchShared<AuthorFace>({
    ctx,
    kind: "profile",
    sku: "reddit.profile",
    normalizedQuery: key,
    maxAgeMs,
    run: async () => {
      const res = await ctx.funded.client.reddit.profile({ username });
      return { data: res.output.found ? res.output.data : null, costUsd: res.costUsd };
    },
    store: async (data) => {
      const profile = data as { username?: string; avatarUrl?: string } | null;
      if (!profile) {
        return null;
      }
      const values = {
        username: key,
        avatarUrl: profile.avatarUrl ?? null,
        fetchedAt: new Date(),
      };
      await db()
        .insert(redditAuthors)
        .values(values)
        .onConflictDoUpdate({ target: redditAuthors.username, set: values });
      return { username: key, avatarUrl: profile.avatarUrl ?? null };
    },
    load: async () => {
      const rows = await db()
        .select()
        .from(redditAuthors)
        .where(eq(redditAuthors.username, key));
      const row = rows[0];
      return row ? { username: row.username, avatarUrl: row.avatarUrl } : null;
    },
  });
}
