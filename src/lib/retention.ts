import { lt } from "drizzle-orm";
import { db } from "@/db";
import { redditPosts } from "@/db/schema";
import { RETENTION_DAYS } from "./tiers";

/** The oldest post creation time we still keep. */
export function retentionCutoff(now: Date, days = RETENTION_DAYS): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

/**
 * Drops shared Reddit posts past the retention window. Comments and the leads
 * pointing at them go with the post, because both cascade from it.
 */
export async function deleteExpiredPosts(now = new Date()): Promise<number> {
  const deleted = await db()
    .delete(redditPosts)
    .where(lt(redditPosts.createdAt, retentionCutoff(now)))
    .returning({ id: redditPosts.id });
  return deleted.length;
}
