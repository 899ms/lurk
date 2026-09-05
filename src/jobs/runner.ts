import { and, eq, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { handlerFor, type Job } from "./registry";

/**
 * Takes one due job. The UPDATE ... RETURNING is the claim: a second worker
 * running the same statement sees started_at already set and gets no row.
 */
export async function claimNextJob(now = new Date()): Promise<Job | null> {
  const claimed = await db()
    .update(jobs)
    .set({ startedAt: now })
    .where(
      and(
        isNull(jobs.startedAt),
        lte(jobs.runAt, now),
        eq(
          jobs.id,
          sql`(select id from ${jobs} where started_at is null and run_at <= ${now.toISOString()}::timestamptz order by run_at limit 1 for update skip locked)`,
        ),
      ),
    )
    .returning();
  return claimed[0] ?? null;
}

/** Runs one due job if there is one. Returns whether it ran anything. */
export async function runDueJob(): Promise<boolean> {
  const job = await claimNextJob();
  if (!job) {
    return false;
  }
  const handler = handlerFor(job.kind);
  try {
    if (!handler) {
      throw new Error(`No handler registered for job kind ${job.kind}`);
    }
    await handler(job);
    await db().update(jobs).set({ finishedAt: new Date() }).where(eq(jobs.id, job.id));
  } catch (error) {
    await db()
      .update(jobs)
      .set({ finishedAt: new Date(), error: String(error) })
      .where(eq(jobs.id, job.id));
  }
  return true;
}
