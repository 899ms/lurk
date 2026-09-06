import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { keywordVolumes, serpResults } from "@/db/schema";
import {
  fetchShared,
  normalizeQuery,
  recordUsage,
  type FetchContext,
  type FetchKind,
  type SharedResult,
} from "@/lib/reddit/fetch";
import { redditResults, type GoogleResult } from "./links";

export type StoredResult = typeof serpResults.$inferSelect;

/**
 * The search_runs kind for a Google search. FetchKind is owned by the Reddit
 * fetch helper and does not name this one yet; the stored column is text.
 */
const GOOGLE_KIND: FetchKind = "serp" as string as FetchKind;

/** Every Google search this app makes asks for United States results. */
export const SEO_GEO = "us";

/** What we actually send Google: the keyword, aimed at Reddit. */
export function googleQuery(keyword: string): string {
  return `${keyword.trim()} reddit`;
}

async function storeResults(data: unknown, runId: string): Promise<StoredResult[]> {
  const results = ((data as { results?: GoogleResult[] } | null)?.results ?? []) as GoogleResult[];
  const threads = redditResults(results);
  if (threads.length === 0) {
    return [];
  }
  return db()
    .insert(serpResults)
    .values(
      threads.map((thread) => ({
        id: randomUUID(),
        searchRunId: runId,
        position: thread.position,
        url: thread.link,
        title: thread.title ?? null,
        snippet: thread.snippet ?? null,
      })),
    )
    .returning();
}

function loadResults(runId: string): Promise<StoredResult[]> {
  return db()
    .select()
    .from(serpResults)
    .where(eq(serpResults.searchRunId, runId))
    .orderBy(asc(serpResults.position));
}

/**
 * The Reddit threads Google ranks for one keyword. Non-Reddit results are
 * dropped before they are stored, so the whole app only ever holds the links
 * it can open through reddit.post.
 */
export async function fetchRankingThreads(
  ctx: FetchContext,
  keyword: string,
  maxAgeMs: number,
): Promise<SharedResult<StoredResult[]>> {
  const query = googleQuery(keyword);
  return fetchShared<StoredResult[]>({
    ctx,
    kind: GOOGLE_KIND,
    sku: "google.search",
    normalizedQuery: normalizeQuery(query),
    maxAgeMs,
    run: async () => {
      const res = await ctx.funded.client.google.search({ query, gl: SEO_GEO });
      return { data: res.output.found ? res.output.data : null, costUsd: res.costUsd };
    },
    store: storeResults,
    load: loadResults,
  });
}

/**
 * Monthly search volume for every keyword in one call. This endpoint costs a
 * hundred times a Reddit call, so it is asked once per refresh for the whole
 * list and never once per keyword.
 */
export async function fetchKeywordVolumes(
  ctx: FetchContext,
  keywords: string[],
): Promise<number> {
  if (keywords.length === 0) {
    return 0;
  }
  const res = await ctx.funded.client.seo.searchVolume({ keywords });
  const rows = res.output.found ? (res.output.data?.keywords ?? []) : [];
  if (rows.length > 0) {
    await db()
      .insert(keywordVolumes)
      .values(
        rows.map((row) => ({
          id: randomUUID(),
          keyword: normalizeQuery(row.keyword),
          geo: SEO_GEO,
          monthlyVolume: row.searchVolume ?? null,
          fetchedAt: new Date(),
        })),
      );
  }
  await recordUsage({
    projectId: ctx.projectId,
    sku: "seo.search_volume",
    costUsd: res.costUsd,
    requestId: ctx.funded.lastRequestId(),
    searchRunId: null,
    reused: false,
  });
  return res.costUsd;
}
