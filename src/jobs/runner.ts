import { and, asc, eq, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { enqueueOnce } from "./enqueue";
import { handlerFor, nextRunAt, type Job } from "./registry";

/**
 * How long a claimed job may run before another worker may take it back. The
 * longest run measured on 2026-09-05 was a scan of about four minutes, so
 * fifteen minutes is that worst case with more than three times the margin: a
 * live job is never stolen, and a job whose process died is picked up again
 * within a quarter of an hour instead of blocking its project forever.
 */
export const LEASE_MS = 15 * 60 * 1000;

/** No other unfinished job of this project may hold a live lease. */
function noSiblingRunning(leaseCutoff: Date) {
  return sql`not exists (
    select 1 from ${jobs} sibling
    where sibling.project_id = ${jobs.projectId}
      and sibling.finished_at is null
      and sibling.started_at is not null
      and sibling.started_at >= ${leaseCutoff.toISOString()}::timestamptz
  )`;
}

/**
 * Takes one due job. The UPDATE ... RETURNING is the claim: a second worker
 * running the same statement sees a live lease and gets no row. A job whose
 * lease has expired is claimable again, which is how a crash recovers. The
 * sibling check is the per-project exclusion: two jobs of one project never run
 * at once, so an unlimited user cannot occupy every worker with one project.
 * Claims are issued one at a time by the scheduler, so the check cannot be read
 * by two workers before either of them has written its own lease.
 */
export async function claimNextJob(now = new Date()): Promise<Job | null> {
  const leaseCutoff = new Date(now.getTime() - LEASE_MS);
  const candidate = db()
    .select({ id: jobs.id })
    .from(jobs)
    .where(
      and(
        isNull(jobs.finishedAt),
        lte(jobs.runAt, now),
        or(isNull(jobs.startedAt), lt(jobs.startedAt, leaseCutoff)),
        noSiblingRunning(leaseCutoff),
      ),
    )
    .orderBy(asc(jobs.runAt))
    .limit(1)
    .for("update", { skipLocked: true });
  const claimed = await db()
    .update(jobs)
    .set({ startedAt: now, finishedAt: null, error: null })
    .where(inArray(jobs.id, candidate))
    .returning();
  return claimed[0] ?? null;
}

/** What a person reading the job should see: the message, never a stack. */
function reasonFor(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function finish(job: Job, error: string | null): Promise<void> {
  await db().update(jobs).set({ finishedAt: new Date(), error }).where(eq(jobs.id, job.id));
}

/**
 * Puts a recurring kind back on the queue after it failed, so one transient
 * error cannot end a project's schedule. It only queues when nothing of that
 * kind is already waiting, so a scan the user asked for keeps its own time.
 */
async function requeueRecurring(job: Job): Promise<void> {
  const runAt = await nextRunAt(job);
  if (runAt) {
    await enqueueOnce(job.kind, runAt, job.projectId);
  }
}

/** Runs one already claimed job to its end, failure included. */
export async function runClaimedJob(job: Job): Promise<void> {
  try {
    const handler = handlerFor(job.kind);
    if (!handler) {
      throw new Error(`No handler registered for job kind ${job.kind}`);
    }
    await handler(job);
    await finish(job, null);
  } catch (error) {
    await finish(job, reasonFor(error));
    await requeueRecurring(job);
  }
}

/** Runs one due job if there is one. Returns whether it ran anything. */
export async function runDueJob(): Promise<boolean> {
  const job = await claimNextJob();
  if (!job) {
    return false;
  }
  await runClaimedJob(job);
  return true;
}
