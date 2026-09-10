import { TIERS, type TierLimits } from "@/lib/tiers";

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
 * How many outbound calls one job has in flight at once, whether it is reading
 * posts, walking a search, or asking the model about a batch. The measured run
 * read 540 posts ten at a time without a failure, so ten is what the evidence
 * covers, and the other three are the same kind of wait from the same process.
 */
export const CALL_CONCURRENCY = 10;

/** Runs `work` over `items`, CALL_CONCURRENCY at a time, in the input order. */
export async function inFlight<T, R>(
  items: T[],
  work: (item: T) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    for (;;) {
      const index = next;
      if (index >= items.length) {
        return;
      }
      next += 1;
      out[index] = await work(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CALL_CONCURRENCY, items.length) }, worker));
  return out;
}

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
 * How many posts one scan may open in full, whatever it opens them for. Both
 * hydrating a Google result and reading a shortlisted candidate buy the same
 * reddit.post call, so they spend one budget: the tier's `hydrationPerScan`,
 * which replaces the old postReadCap because it caps exactly the same calls.
 */
export function hydrationCap(limits: TierLimits | null): number | null {
  return limits ? limits.hydrationPerScan : null;
}

/** What one scan may buy of each kind. A self-hosted instance has no tier of
 * its own, so it retrieves like a connected one and caps nothing. */
export function retrievalBudgets(limits: TierLimits | null): {
  searches: number;
  scoped: number;
  listings: number;
  serpPerDay: number;
  pages: number;
} {
  const source = limits ?? TIERS.connected;
  return {
    searches: source.searchesPerScan,
    scoped: source.scopedSearchesPerScan,
    listings: source.listingPilotsPerScan,
    serpPerDay: source.serpQueriesPerDay,
    pages: source.searchPagesPerQuery,
  };
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
