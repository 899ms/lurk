import type { jobs } from "@/db/schema";
import { runCompetitorScan } from "@/lib/competitors/scan";

/** The registry entry for a competitor scan: one project, one pass. */
export async function runCompetitorsJob(job: typeof jobs.$inferSelect): Promise<void> {
  if (!job.projectId) {
    throw new Error("A competitor scan needs a project");
  }
  await runCompetitorScan(job.projectId, job.id);
}
