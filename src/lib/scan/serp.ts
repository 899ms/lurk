import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { serpResults } from "@/db/schema";
import {
  fetchShared,
  normalizeQuery,
  variantOf,
  type FetchContext,
  type SharedResult,
} from "@/lib/reddit/fetch";
import { redditThread, type GoogleResult, type RedditThread } from "@/lib/seo/links";

/**
 * The scan's own Google feed: the Reddit threads Google has ranked for one of
 * the plan's queries in the last week. It buys the same SKU as the SEO refresh
 * and stores the same rows, but it asks a different question - what is new -
 * so it is its own run with its own timeframe, and the two never serve each
 * other's answer.
 */

/** What Google is asked to restrict its answer to. */
export const FEED_TIMEFRAME = "7d";

const GEO = "us";
const LANGUAGE = "en";

async function storeThreads(data: unknown, runId: string): Promise<RedditThread[]> {
  const results = ((data as { results?: GoogleResult[] } | null)?.results ?? []) as GoogleResult[];
  const rows = results
    .map((result) => ({ result, thread: redditThread(result.link ?? "") }))
    .filter((entry): entry is { result: GoogleResult; thread: RedditThread } => entry.thread !== null);
  if (rows.length === 0) {
    return [];
  }
  await db()
    .insert(serpResults)
    .values(
      rows.map((entry) => ({
        id: randomUUID(),
        searchRunId: runId,
        position: entry.result.position,
        url: entry.thread.canonicalUrl,
        title: entry.result.title ?? null,
        snippet: entry.result.snippet ?? null,
      })),
    );
  return rows.map((entry) => entry.thread);
}

async function loadThreads(runId: string): Promise<RedditThread[]> {
  const rows = await db()
    .select()
    .from(serpResults)
    .where(eq(serpResults.searchRunId, runId))
    .orderBy(asc(serpResults.position));
  return rows
    .map((row) => redditThread(row.url))
    .filter((thread): thread is RedditThread => thread !== null);
}

/** One Google search of the last week, kept for as long as the caller's cadence. */
export async function fetchFeedThreads(
  ctx: FetchContext,
  query: string,
): Promise<SharedResult<RedditThread[]>> {
  return fetchShared<RedditThread[]>({
    ctx,
    kind: "serp",
    sku: "google.search",
    normalizedQuery: normalizeQuery(query),
    timeframe: FEED_TIMEFRAME,
    variant: variantOf({ gl: GEO, hl: LANGUAGE }),
    run: async () => {
      const res = await ctx.funded.client.google.search({
        query,
        gl: GEO,
        hl: LANGUAGE,
        timeframe: FEED_TIMEFRAME,
      });
      return { data: res.output.found ? res.output.data : null, costUsd: res.costUsd };
    },
    store: storeThreads,
    load: loadThreads,
  });
}
