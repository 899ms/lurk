import { and, eq, lt, notExists, sql } from "drizzle-orm";
import { db } from "@/db";
import { leads, redditPosts, seoOpportunities } from "@/db/schema";
import { RETENTION_DAYS } from "./tiers";

/** The oldest post creation time we still keep. */
export function retentionCutoff(now: Date, days = RETENTION_DAYS): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

/**
 * Drops shared Reddit posts past the retention window. A post someone is still
 * shown - a lead in a feed, a thread in the Reddit SEO tab - is kept however
 * old it is, because the age of a ranking thread is the whole point of it.
 * Comments and evaluations still go with the post, because they cascade.
 */
export async function deleteExpiredPosts(now = new Date()): Promise<number> {
  const deleted = await db()
    .delete(redditPosts)
    .where(
      and(
        lt(redditPosts.createdAt, retentionCutoff(now)),
        notExists(
          db().select({ one: sql`1` }).from(leads).where(eq(leads.postId, redditPosts.id)),
        ),
        notExists(
          db()
            .select({ one: sql`1` })
            .from(seoOpportunities)
            .where(eq(seoOpportunities.postId, redditPosts.id)),
        ),
      ),
    )
    .returning({ id: redditPosts.id });
  return deleted.length;
}
