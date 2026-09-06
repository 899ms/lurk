import type { JobRow } from "@/jobs/enqueue";

type ScanStatusProps = { job: JobRow | null };

/** How long ago something happened, in the wording the whole feed uses. */
export function relativeAge(date: Date): string {
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return `${Math.round(hours / 24)}d ago`;
}

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
