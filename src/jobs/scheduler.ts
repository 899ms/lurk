import { Cron } from "croner";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { config } from "@/lib/config";
import { enqueueOnce } from "./enqueue";
import { claimNextJob, runClaimedJob } from "./runner";

let started: Cron | null = null;

/** Jobs running right now, and whether a pump is already handing work out. */
let running = 0;
let pumping = false;

/**
 * Fills every free worker slot, claiming one job at a time. Serial claiming is
 * what makes the per-project exclusion in claimNextJob reliable: the next claim
 * always sees the lease the previous one wrote. A finishing job pumps again, so
 * a freed slot does not wait for the next tick.
 */
async function pump(workers: number): Promise<void> {
  if (pumping) {
    return;
  }
  pumping = true;
  try {
    while (running < workers) {
      const job = await claimNextJob();
      if (!job) {
        return;
      }
      running += 1;
      void runClaimedJob(job).finally(() => {
        running -= 1;
        void pump(workers);
      });
    }
  } finally {
    pumping = false;
  }
}

/**
 * Queues a scan for every project that has none waiting. A scan whose process
 * died left no successor behind, so without this a project stops being scanned
 * until somebody presses the button.
 */
export async function seedProjectScans(): Promise<void> {
  const rows = await db().select({ id: projects.id }).from(projects);
  for (const row of rows) {
    await enqueueOnce("scan", new Date(), row.id);
  }
}

/**
 * One tick a minute, handing due jobs to a bounded set of workers. Startup
 * queues the two instance-wide jobs and any project schedule that went missing;
 * from then on each job queues its own next run, and the runner re-queues a
 * recurring one that failed.
 */
export function startScheduler(): Cron {
  if (!started) {
    const workers = config().SCHEDULER_WORKERS;
    void enqueueOnce("retention");
    void enqueueOnce("digest");
    void seedProjectScans();
    started = new Cron("* * * * *", async () => {
      await pump(workers);
    });
  }
  return started;
}
