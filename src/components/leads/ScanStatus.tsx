import type { JobRow } from "@/jobs/enqueue";
import { relativeAge } from "@/lib/format";

type ScanStatusProps = { job: JobRow | null };

function firstSentence(error: string): string {
  const line = error.split("\n")[0].trim();
  return line.endsWith(".") ? line : `${line}.`;
}

function sentence(job: JobRow | null): string {
  if (!job) {
    return "No scan has run yet. Press Scan now to look for leads.";
  }
  if (!job.startedAt) {
    return "A scan is queued and starts within the minute.";
  }
  if (!job.finishedAt) {
    return job.progress ? `Scanning now: ${job.progress}` : "Scanning now.";
  }
  if (job.error) {
    return `Last scan stopped: ${firstSentence(job.error)}`;
  }
  return `Last scan finished ${relativeAge(job.finishedAt)}.`;
}

/** One plain sentence about the project's most recent scan. */
export function ScanStatus({ job }: ScanStatusProps) {
  return <p className="text-small text-fg-muted">{sentence(job)}</p>;
}
