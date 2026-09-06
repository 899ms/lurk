import { Cron } from "croner";
import { enqueueOnce } from "./enqueue";
import { runDueJob } from "./runner";

let started: Cron | null = null;

/**
 * One tick a minute, draining whatever is due. Guarded by RUN_SCHEDULER. The
 * two instance-wide jobs are queued on startup; each one queues its own next
 * run when it finishes, so this is the only place they have to be started.
 */
export function startScheduler(): Cron {
  if (!started) {
    void enqueueOnce("retention");
    void enqueueOnce("digest");
    started = new Cron("* * * * *", { protect: true }, async () => {
      while (await runDueJob()) {
        // Drain the queue; runDueJob returns false when nothing is due.
      }
    });
  }
  return started;
}
