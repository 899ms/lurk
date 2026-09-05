import { Cron } from "croner";
import { enqueueOnce } from "./enqueue";
import { runDueJob } from "./runner";

let started: Cron | null = null;

/** One tick a minute, draining whatever is due. Guarded by RUN_SCHEDULER. */
export function startScheduler(): Cron {
  if (!started) {
    void enqueueOnce("retention");
    started = new Cron("* * * * *", { protect: true }, async () => {
      while (await runDueJob()) {
        // Drain the queue; runDueJob returns false when nothing is due.
      }
    });
  }
  return started;
}
