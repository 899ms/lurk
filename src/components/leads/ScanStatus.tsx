import { activitySentence, type ProjectActivity } from "@/lib/projectActivity";

/**
 * One plain line about what this project is doing: the setup of a brand new
 * project, its first sweep of the past year, or its scans. The sentence is the
 * one the whole app reads, so this page can never claim nothing is scheduled
 * while the project's first jobs are queued.
 */
export function ScanStatus({ activity }: { activity: ProjectActivity }) {
  return <p className="text-small text-fg-muted">{activitySentence(activity)}</p>;
}
