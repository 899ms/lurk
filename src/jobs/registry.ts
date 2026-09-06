import { eq } from "drizzle-orm";
import { db } from "@/db";
import { jobs, projects } from "@/db/schema";
import { CADENCE_MS } from "@/lib/alerts/select";
import { deleteExpiredPosts } from "@/lib/retention";
import { runScan } from "@/lib/scan/run";
import { scanIntervalHours, tierForUser } from "@/lib/tier";
import { runCompetitorsJob } from "./competitors";
import { runDigest } from "./digest";
import { runInsightsJob } from "./insights";
import { enqueueOnce } from "./enqueue";
import { runSeoRefreshJob } from "./seo";

export type Job = typeof jobs.$inferSelect;
export type JobHandler = (job: Job) => Promise<void>;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Every job kind the scheduler knows how to run. */
export const JOB_HANDLERS: Record<string, JobHandler> = {
  noop: async () => {},
  scan: async (job) => {
    if (!job.projectId) {
      throw new Error("A scan job needs a project");
    }
    await runScan(job.projectId, job.id);
  },
  insights: runInsightsJob,
  competitor_scan: runCompetitorsJob,
  seo_refresh: runSeoRefreshJob,
  digest: runDigest,
  retention: async () => {
    await deleteExpiredPosts();
    await enqueueOnce("retention", new Date(Date.now() + DAY_MS));
  },
};

export function handlerFor(kind: string): JobHandler | null {
  return JOB_HANDLERS[kind] ?? null;
}

/** Hours between this project's scheduled scans, which its tier decides. */
async function scanIntervalHoursFor(projectId: string): Promise<number> {
  const rows = await db()
    .select({ userId: projects.userId })
    .from(projects)
    .where(eq(projects.id, projectId));
  const userId = rows[0]?.userId;
  return scanIntervalHours(userId ? (await tierForUser(userId)).limits : null);
}

/**
 * When a recurring kind is due again, or null when the kind runs once on
 * request. This repo has no retry policy, so a failed job simply waits its own
 * cadence: a scan retries one scan interval later, retention a day later,
 * digest an hour later. That bounds retries at one attempt per cadence and
 * never runs a recurring job sooner than it would have run anyway.
 */
export async function nextRunAt(job: Job): Promise<Date | null> {
  const now = Date.now();
  if (job.kind === "scan" && job.projectId) {
    return new Date(now + (await scanIntervalHoursFor(job.projectId)) * HOUR_MS);
  }
  if (job.kind === "retention") {
    return new Date(now + DAY_MS);
  }
  if (job.kind === "digest") {
    return new Date(now + CADENCE_MS.hourly);
  }
  return null;
}
