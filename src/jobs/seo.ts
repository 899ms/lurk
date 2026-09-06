import type { jobs } from "@/db/schema";
import { runSeoRefresh } from "@/lib/seo/refresh";

type Job = typeof jobs.$inferSelect;

/** The seo_refresh job: which Reddit threads Google ranks for this project. */
export async function runSeoRefreshJob(job: Job): Promise<void> {
  if (!job.projectId) {
    throw new Error("A Reddit SEO refresh needs a project");
  }
  await runSeoRefresh(job.projectId, job.id);
}
