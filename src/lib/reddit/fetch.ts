import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, isNull } from "drizzle-orm";
import { db } from "@/db";
import { searchRuns, usageLedger } from "@/db/schema";
import type { FundedClient } from "@/lib/anyapi";
import { assertHouseDataUnderCap } from "@/lib/usage";
/** One search_runs row per kind of thing we fetch, on Reddit or on Google. */
export type FetchKind =
  | "keyword"
  | "subreddit_posts"
  | "post"
  | "comments"
  | "subreddit"
  | "profile"
  | "serp";

export type FetchContext = { projectId: string; funded: FundedClient; maxAgeMs: number };

type StoredRun = typeof searchRuns.$inferSelect;

type SharedFetch<T> = {
  ctx: FetchContext;
  kind: FetchKind;
  sku: string;
  normalizedQuery: string;
  sort?: string | null;
  timeframe?: string | null;
  maxAgeMs?: number;
  run: () => Promise<{ data: unknown; costUsd: number }>;
  store: (data: unknown, runId: string) => Promise<T>;
  load: (runId: string) => Promise<T>;
};

export type SharedResult<T> = { value: T; reused: boolean; costUsd: number };

/** A stored run may serve the caller when it is younger than their cadence. */
export function isFreshEnough(fetchedAt: Date, maxAgeMs: number, now = new Date()): boolean {
  return now.getTime() - fetchedAt.getTime() <= maxAgeMs;
}

async function findRun(
  kind: FetchKind,
  normalizedQuery: string,
  sort: string | null,
  timeframe: string | null,
  maxAgeMs: number,
): Promise<StoredRun | null> {
  const rows = await db()
    .select()
    .from(searchRuns)
    .where(
      and(
        eq(searchRuns.kind, kind),
        eq(searchRuns.normalizedQuery, normalizedQuery),
        sort === null ? isNull(searchRuns.sort) : eq(searchRuns.sort, sort),
        timeframe === null ? isNull(searchRuns.timeframe) : eq(searchRuns.timeframe, timeframe),
        gte(searchRuns.fetchedAt, new Date(Date.now() - maxAgeMs)),
      ),
    )
    .orderBy(desc(searchRuns.fetchedAt))
    .limit(1);
  return rows[0] ?? null;
}

/** One usage_ledger line. Exported so a non-shared call can record itself too. */
export async function recordUsage(input: {
  projectId: string;
  sku: string;
  costUsd: number;
  requestId: string | null;
  searchRunId: string | null;
  reused: boolean;
}) {
  await db().insert(usageLedger).values({
    projectId: input.projectId,
    sku: input.sku,
    costUsd: input.costUsd.toFixed(6),
    requestId: input.requestId,
    searchRunId: input.searchRunId,
    reused: input.reused,
  });
}

/**
 * The one place a Reddit fetch happens. A run inside the caller's cadence
 * window is reused and billed at zero; otherwise we call AnyAPI, store the run,
 * and attribute its cost to the project that asked. A thrown SDK error writes
 * no run and no ledger line, so a failed scan never looks like a paid one.
 *
 * Every paid call the house pays for passes the daily house cap first. A user
 * spending their own wallet is exempt: that money is not ours to ration.
 */
export async function fetchShared<T>(input: SharedFetch<T>): Promise<SharedResult<T>> {
  const { ctx, kind, sku, normalizedQuery } = input;
  const sort = input.sort ?? null;
  const timeframe = input.timeframe ?? null;
  const maxAgeMs = input.maxAgeMs ?? ctx.maxAgeMs;

  const existing = await findRun(kind, normalizedQuery, sort, timeframe, maxAgeMs);
  if (existing) {
    const value = await input.load(existing.id);
    await recordUsage({
      projectId: ctx.projectId,
      sku,
      costUsd: 0,
      requestId: existing.requestId,
      searchRunId: existing.id,
      reused: true,
    });
    return { value, reused: true, costUsd: 0 };
  }

  if (ctx.funded.funding === "house") {
    await assertHouseDataUnderCap();
  }
  const { result, requestId } = await ctx.funded.call(input.run);
  const runId = randomUUID();
  await db().insert(searchRuns).values({
    id: runId,
    kind,
    normalizedQuery,
    sort,
    timeframe,
    costUsd: result.costUsd.toFixed(6),
    requestId,
    fundedBy: ctx.funded.funding,
  });
  const value = await input.store(result.data, runId);
  await recordUsage({
    projectId: ctx.projectId,
    sku,
    costUsd: result.costUsd,
    requestId,
    searchRunId: runId,
    reused: false,
  });
  return { value, reused: false, costUsd: result.costUsd };
}

/** Trimmed and lowercased, so two projects asking the same thing share a run. */
export function normalizeQuery(value: string): string {
  return value.trim().toLowerCase();
}
