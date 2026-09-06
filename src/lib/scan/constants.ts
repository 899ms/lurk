import type { TierLimits, TierName } from "@/lib/tiers";

/**
 * The most posts one free-tier scan may read in full. Derived from the cost
 * arithmetic in .context/implementation-notes.md: a worst-case free scan of 25
 * keywords, 10 subreddits, 60 post reads and 20 comment reads is $0.115, which
 * keeps a fully active free user inside the house data cap.
 */
export const MAX_POST_READS_FREE = 60;

/**
 * The user's optional extra floor on the feed, set on the Product page. The
 * non-compensatory gates in gates.ts decide what qualifies; this only hides
 * qualified leads a user considers too weak. The default is the bottom of the
 * qualified band (fit 3, intent 2, engagement 0 folds to 50), so out of the box
 * it admits every qualified lead.
 */
export const DEFAULT_SCORE_THRESHOLD = 50;

/** How many items one scoring call judges at a time. */
export const SCORE_BATCH_SIZE = 10;

/**
 * How many titles one triage call reads at a time. The saved runs in
 * .context/reddit-leads-proof/scorer-pass.md and scorer-pass-2.md triaged 70,
 * 77 and 78 titles in a single call and each came back complete, so 70 is the
 * largest batch measurement supports rather than a guess. Sending every title
 * of a large project in one call is what left a scan of 188 titles stalled on
 * 2026-09-06.
 */
export const TRIAGE_BATCH_SIZE = 70;

/** A thread with fewer replies than this is not worth buying its comments. */
export const MIN_COMMENTS_FOR_THREAD = 3;

/**
 * How many candidates are read in full. Three times the comment budget leaves
 * room for the scorer to reject two of every three titles the prefilter kept.
 */
export function postReadCap(limits: TierLimits | null, tier: TierName): number | null {
  if (!limits || limits.commentThreadsPerScan == null) {
    return null;
  }
  const cap = limits.commentThreadsPerScan * 3;
  return tier === "free" ? Math.min(cap, MAX_POST_READS_FREE) : cap;
}

/**
 * How alive and how answerable a thread is, 0-4, computed here from facts we
 * hold rather than asked of a model that cannot see a clock. Two halves:
 *
 *   freshness   under 24h: 2   under 72h: 1   older: 0
 *   reply room  no replies: 2  under 10: 1    10 or more: 0
 *
 * The 24 and 72 hour steps are the decay hypothesis the external review
 * proposed (astra-roast-2026-09-06.md, "ranking heuristic"), not a measured
 * constant. The reply-room half says a crowded thread is a worse place to
 * answer, never that it is solved: only the model's needState can say that.
 */
export function engagementScore(ageHours: number, numComments: number | null): number {
  const freshness = ageHours <= 24 ? 2 : ageHours <= 72 ? 1 : 0;
  const replies = numComments ?? 0;
  const room = replies === 0 ? 2 : replies < 10 ? 1 : 0;
  return freshness + room;
}

/**
 * The feed's sort order, 0-100. Only leads the gates qualified reach the feed,
 * so this decides order among leads that already passed, never admission:
 *
 *   score = 100 * (2 * fit + 2 * intent + engagement) / 20
 *
 * fit and intent are the model's 0-4 scales and carry double the weight of the
 * 0-4 engagement, because what the person needs outranks how fresh the thread
 * is. A missing fit or intent counts as 0. A qualified lead is fit >= 3 and
 * intent >= 2, so the qualified band starts at 50 and the maximum is 100.
 */
export function foldScore(fit: number | null, intent: number | null, engagement: number): number {
  const weighted = (fit ?? 0) * 2 + (intent ?? 0) * 2 + engagement;
  return Math.round((weighted / 20) * 100);
}
