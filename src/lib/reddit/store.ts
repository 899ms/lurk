import { asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { redditComments, redditPosts, searchRunPosts } from "@/db/schema";

export type StoredPost = typeof redditPosts.$inferSelect;
export type StoredComment = typeof redditComments.$inferSelect;

/** A post as any of the three Reddit listing shapes hands it to us. */
export type RawPost = {
  id: string;
  title: string;
  author?: string;
  body?: string;
  score?: number;
  numComments?: number;
  permalink?: string;
  url?: string;
  createdUtc?: number;
  subreddit: string;
};

export type RawComment = {
  id: string;
  author?: string;
  body?: string;
  score?: number;
  url?: string;
  createdUtc?: number;
};

/** Reddit ids arrive prefixed on some shapes and bare on others; we store bare. */
export function bareId(id: string): string {
  return id.replace(/^t\d_/, "");
}

/** Seconds since the epoch, as Reddit sends every timestamp. */
function at(createdUtc: number | undefined): Date {
  return new Date((createdUtc ?? 0) * 1000);
}

function absolutePermalink(post: RawPost): string {
  const permalink = post.permalink ?? "";
  if (permalink.startsWith("http")) {
    return permalink;
  }
  return permalink ? `https://www.reddit.com${permalink}` : (post.url ?? "");
}

function postValues(post: RawPost) {
  return {
    id: bareId(post.id),
    subreddit: post.subreddit,
    author: post.author ?? null,
    title: post.title,
    body: post.body ?? null,
    url: absolutePermalink(post),
    score: post.score ?? null,
    numComments: post.numComments ?? null,
    createdAt: at(post.createdUtc),
    fetchedAt: new Date(),
  };
}

/**
 * Writes the shared post rows. A later fetch may carry a body the listing did
 * not have, so an absent body never overwrites one we already hold.
 */
export async function upsertPosts(posts: RawPost[]): Promise<StoredPost[]> {
  if (posts.length === 0) {
    return [];
  }
  return db()
    .insert(redditPosts)
    .values(posts.map(postValues))
    .onConflictDoUpdate({
      target: redditPosts.id,
      set: {
        title: sql`excluded.title`,
        body: sql`coalesce(excluded.body, ${redditPosts.body})`,
        score: sql`excluded.score`,
        numComments: sql`excluded.num_comments`,
        fetchedAt: sql`excluded.fetched_at`,
      },
    })
    .returning();
}

/** Records which posts a run produced, in the order the upstream ranked them. */
export async function linkRunPosts(searchRunId: string, postIds: string[]) {
  if (postIds.length === 0) {
    return;
  }
  await db()
    .insert(searchRunPosts)
    .values(postIds.map((postId, index) => ({ searchRunId, postId, position: index })))
    .onConflictDoNothing();
}

/** The posts one stored run produced, in its original order. */
export async function postsOfRun(searchRunId: string): Promise<StoredPost[]> {
  const rows = await db()
    .select({ post: redditPosts })
    .from(searchRunPosts)
    .innerJoin(redditPosts, eq(redditPosts.id, searchRunPosts.postId))
    .where(eq(searchRunPosts.searchRunId, searchRunId))
    .orderBy(asc(searchRunPosts.position));
  return rows.map((row) => row.post);
}

export async function upsertComments(
  postId: string,
  comments: RawComment[],
): Promise<StoredComment[]> {
  if (comments.length === 0) {
    return [];
  }
  return db()
    .insert(redditComments)
    .values(
      comments.map((comment) => ({
        id: bareId(comment.id),
        postId,
        author: comment.author ?? null,
        body: comment.body ?? null,
        score: comment.score ?? null,
        createdAt: at(comment.createdUtc),
        fetchedAt: new Date(),
      })),
    )
    .onConflictDoUpdate({
      target: redditComments.id,
      set: { body: sql`excluded.body`, score: sql`excluded.score` },
    })
    .returning();
}

export async function commentsOfPost(postId: string): Promise<StoredComment[]> {
  return db().select().from(redditComments).where(eq(redditComments.postId, postId));
}

export async function postsByIds(ids: string[]): Promise<StoredPost[]> {
  if (ids.length === 0) {
    return [];
  }
  return db().select().from(redditPosts).where(inArray(redditPosts.id, ids));
}
