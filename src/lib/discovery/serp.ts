import type { FetchContext } from "@/lib/reddit/fetch";
import { fetchGoogleThreads } from "@/lib/seo/fetch";
import { redditThread } from "@/lib/seo/links";
import type { DiscoveryQuery } from "./queries";
import { writeObservations, type Observation } from "./store";

/**
 * Running discovery's queries on Google and keeping what came back. Every call
 * goes through the app's one shared Google fetch, so a query two projects ask
 * is bought once, the house cap is checked before any house-funded call, and
 * the run is recorded where the usage screen can read it.
 */

/** The Google results of one query, as observations of Reddit threads. */
export function observationsOf(
  query: DiscoveryQuery,
  results: { url: string; title: string | null; snippet: string | null; position: number | null }[],
): Observation[] {
  const seen = new Set<string>();
  const observations: Observation[] = [];
  for (const result of results) {
    const thread = redditThread(result.url);
    if (!thread || seen.has(thread.postId)) {
      continue;
    }
    seen.add(thread.postId);
    observations.push({
      postId: thread.postId,
      canonicalUrl: thread.canonicalUrl,
      subreddit: thread.subreddit.toLowerCase(),
      query: query.query,
      family: query.family,
      destination: query.destination,
      position: result.position,
      title: result.title,
      snippet: result.snippet,
    });
  }
  return observations;
}

export type SerpOutcome = { observations: Observation[]; costUsd: number };

/**
 * Buys one round of discovery queries and stores what each saw. A query Google
 * answers with nothing is not an error: it is a family or a place with no
 * evidence, which is exactly what expansion reads.
 */
export async function runDiscoveryQueries(
  ctx: FetchContext,
  queries: DiscoveryQuery[],
  maxAgeMs: number,
): Promise<SerpOutcome> {
  const observations: Observation[] = [];
  let costUsd = 0;
  for (const query of queries) {
    const found = await fetchGoogleThreads(ctx, query.query, maxAgeMs);
    costUsd += found.costUsd;
    observations.push(...observationsOf(query, found.value));
  }
  await writeObservations(ctx.projectId, observations);
  return { observations, costUsd };
}
