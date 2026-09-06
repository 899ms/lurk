import type { jobs } from "@/db/schema";
import { deleteExpiredPosts } from "@/lib/retention";
import { runScan } from "@/lib/scan/run";
import { runCompetitorsJob } from "./competitors";
import { runDigest } from "./digest";
import { runInsightsJob } from "./insights";
import { enqueueOnce } from "./enqueue";
import { runSeoRefreshJob } from "./seo";

export type Job = typeof jobs.$inferSelect;
export type JobHandler = (job: Job) => Promise<void>;

const DAY_MS = 24 * 60 * 60 * 1000;

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
