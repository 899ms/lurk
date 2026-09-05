import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { jobs } from "@/db/schema";

export type JobRow = typeof jobs.$inferSelect;

/**
 * Queues one job of a kind for a project, replacing any queued job of that kind
 * that has not started. A user pressing Scan now moves the schedule forward
 * rather than stacking a second scan behind it.
 */
export async function enqueueJob(
  kind: string,
  projectId: string | null,
  runAt = new Date(),
): Promise<JobRow> {
  await db()
    .delete(jobs)
    .where(
      and(
        eq(jobs.kind, kind),
        isNull(jobs.startedAt),
        projectId === null ? isNull(jobs.projectId) : eq(jobs.projectId, projectId),
      ),
    );
  const rows = await db().insert(jobs).values({ kind, projectId, runAt }).returning();
  return rows[0];
}

/** Queues a job only when one of that kind is not already waiting. */
export async function enqueueOnce(kind: string, runAt = new Date()): Promise<void> {
  const waiting = await db()
    .select({ id: jobs.id })
    .from(jobs)
    .where(and(eq(jobs.kind, kind), isNull(jobs.startedAt)))
    .limit(1);
  if (waiting.length === 0) {
    await db().insert(jobs).values({ kind, runAt });
  }
}

export async function writeProgress(jobId: string, progress: string): Promise<void> {
  await db().update(jobs).set({ progress }).where(eq(jobs.id, jobId));
}

/** The last job of a kind this project actually ran, or null before the first. */
export async function lastRunJob(kind: string, projectId: string): Promise<JobRow | null> {
  const rows = await db()
    .select()
    .from(jobs)
    .where(and(eq(jobs.kind, kind), eq(jobs.projectId, projectId)))
    .orderBy(sql`started_at desc nulls last`)
    .limit(1);
  return rows[0] ?? null;
}
