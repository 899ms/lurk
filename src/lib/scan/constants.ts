import type { TierLimits, TierName } from "@/lib/tiers";

/**
 * The most posts one free-tier scan may read in full. Derived from the cost
 * arithmetic in .context/implementation-notes.md: a worst-case free scan of 25
 * keywords, 10 subreddits, 60 post reads and 20 comment reads is $0.115, which
 * keeps a fully active free user inside the house data cap.
 */
export const MAX_POST_READS_FREE = 60;

/**
 * MentionCatch's published cut, and the plan's default until a user moves it on
 * the Product page.
 */
export const DEFAULT_SCORE_THRESHOLD = 60;

/** How many items one scoring call judges at a time. */
export const SCORE_BATCH_SIZE = 10;

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

/** The three dimensions folded into one sort order, with intent weighted double. */
export function foldScore(fit: number, intent: number, engagement: number): number {
  const weighted = fit + intent * 2 + engagement;
  return Math.round((weighted / 40) * 100);
}
