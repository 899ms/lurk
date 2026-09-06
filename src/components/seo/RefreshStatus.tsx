import { relativeAge } from "@/components/leads/ScanStatus";
import type { JobRow } from "@/jobs/enqueue";

type RefreshStatusProps = { job: JobRow | null };

function sentence(job: JobRow | null): string {
  if (!job) {
    return "No refresh has run yet.";
  }
  if (!job.startedAt) {
    return "A refresh is queued and starts within the minute.";
  }
  if (!job.finishedAt) {
    return job.progress ? `Refreshing now: ${job.progress}` : "Refreshing now.";
  }
  if (job.error) {
    return `Last refresh stopped: ${job.error.split("\n")[0].trim()}`;
  }
  return `Last refresh finished ${relativeAge(job.finishedAt)}.`;
}

/** One plain sentence about this project's most recent Reddit SEO refresh. */
export function RefreshStatus({ job }: RefreshStatusProps) {
  return <p className="text-small text-fg-muted">{sentence(job)}</p>;
}
