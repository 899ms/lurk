import type { JobRow } from "@/jobs/enqueue";
import { relativeAge, relativeUntil } from "@/lib/format";

type ScanStatusProps = { last: JobRow | null; next: JobRow | null };

function firstSentence(error: string): string {
  const line = error.split("\n")[0].trim();
  return line.endsWith(".") ? line : `${line}.`;
}

function lastSentence(job: JobRow | null): string | null {
  if (!job?.startedAt) {
    return null;
  }
  if (!job.finishedAt) {
    return job.progress ? `Scanning now: ${job.progress}` : "Scanning now.";
  }
  if (job.error) {
    return `Last scan stopped: ${firstSentence(job.error)}`;
  }
  return `Last scan finished ${relativeAge(job.finishedAt)}.`;
}

function nextSentence(job: JobRow | null): string {
  if (!job) {
    return "No scan is scheduled. Press Scan now.";
  }
  const until = relativeUntil(job.runAt);
  return until === "now" ? "Next scan is due now." : `Next scan ${until}.`;
}

/** One plain line: what the last scan did and when the next one happens. */
export function ScanStatus({ last, next }: ScanStatusProps) {
  const running = last?.startedAt && !last.finishedAt;
  const parts = running ? [lastSentence(last)] : [lastSentence(last), nextSentence(next)];
  return <p className="text-small text-fg-muted">{parts.filter(Boolean).join(" ")}</p>;
}
