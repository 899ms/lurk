import type { JobRow } from "@/jobs/enqueue";
import { relativeAge, relativeUntil } from "@/lib/format";
import { NO_PHRASINGS_PROGRESS } from "@/lib/seo/read";

type RefreshStatusProps = { last: JobRow | null; next: JobRow | null };

function firstSentence(error: string): string {
  const line = error.split("\n")[0].trim();
  return line.endsWith(".") ? line : `${line}.`;
}

function lastSentence(job: JobRow | null): string | null {
  if (!job?.startedAt) {
    return null;
  }
  if (!job.finishedAt) {
    return job.progress ? `Refreshing now: ${job.progress}` : "Refreshing now.";
  }
  if (job.error) {
    return `Last refresh stopped: ${firstSentence(job.error)}`;
  }
  if (job.progress === NO_PHRASINGS_PROGRESS) {
    return `The last refresh, ${relativeAge(job.finishedAt)}, had nothing to look up.`;
  }
  return `Last refresh finished ${relativeAge(job.finishedAt)}.`;
}

function nextSentence(job: JobRow | null): string {
  if (!job) {
    return "No refresh is scheduled. Press Refresh now.";
  }
  const until = relativeUntil(job.runAt);
  return until === "now" ? "The next refresh is due now." : `Next refresh ${until}.`;
}

/** One plain line: what the last Reddit SEO refresh did, and when the next one runs. */
export function RefreshStatus({ last, next }: RefreshStatusProps) {
  const running = Boolean(last?.startedAt && !last.finishedAt);
  const parts = running
    ? [lastSentence(last)]
    : [lastSentence(last) ?? "No refresh has run yet.", nextSentence(next)];
  return <p className="text-small text-fg-muted">{parts.filter(Boolean).join(" ")}</p>;
}
