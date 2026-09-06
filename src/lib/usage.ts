import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { llmUsage, searchRuns, usageLedger } from "@/db/schema";
import { config } from "./config";

export type SkuUsage = { sku: string; calls: number; costUsd: number; reused: number };

export type UsageToday = {
  calls: number;
  costUsd: number;
  fetched: number;
  reused: number;
  perSku: SkuUsage[];
};

const EMPTY: UsageToday = { calls: 0, costUsd: 0, fetched: 0, reused: 0, perSku: [] };

function startOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Today's ledger for a set of projects, grouped by SKU. */
export async function usageToday(projectIds: string[]): Promise<UsageToday> {
  if (projectIds.length === 0) {
    return EMPTY;
  }
  const rows = await db()
    .select({
      sku: usageLedger.sku,
      calls: sql<number>`count(*)::int`,
      costUsd: sql<string>`coalesce(sum(${usageLedger.costUsd}), 0)`,
      reused: sql<number>`count(*) filter (where ${usageLedger.reused})::int`,
    })
    .from(usageLedger)
    .where(and(inArray(usageLedger.projectId, projectIds), gte(usageLedger.at, startOfToday())))
    .groupBy(usageLedger.sku);

  const perSku: SkuUsage[] = rows.map((row) => ({
    sku: row.sku,
    calls: row.calls,
    costUsd: Number(row.costUsd),
    reused: row.reused,
  }));
  return {
    calls: perSku.reduce((total, row) => total + row.calls, 0),
    costUsd: perSku.reduce((total, row) => total + row.costUsd, 0),
    fetched: perSku.reduce((total, row) => total + row.calls - row.reused, 0),
    reused: perSku.reduce((total, row) => total + row.reused, 0),
    perSku,
  };
}

/** Raised when today's house AnyAPI spend has already reached its ceiling. */
export class HouseDataCapReachedError extends Error {
  constructor(capUsd: number) {
    super(`Today's data budget of $${capUsd.toFixed(2)} is used up. Scans resume tomorrow.`);
    this.name = "HouseDataCapReachedError";
  }
}

/**
 * What the house key has spent on AnyAPI since midnight UTC, across every
 * project. Read from search_runs because that is the only table that records
 * who paid; a reused run costs nothing and is stored as no new run at all.
 */
export async function houseDataSpendToday(): Promise<number> {
  const rows = await db()
    .select({ total: sql<string>`coalesce(sum(${searchRuns.costUsd}), 0)` })
    .from(searchRuns)
    .where(and(eq(searchRuns.fundedBy, "house"), gte(searchRuns.fetchedAt, startOfToday())));
  return Number(rows[0]?.total ?? 0);
}

/** Throws before a house-funded call that today's budget can no longer cover. */
export async function assertHouseDataUnderCap(): Promise<void> {
  const cap = config().HOUSE_DATA_CAP_USD_PER_DAY;
  if ((await houseDataSpendToday()) >= cap) {
    throw new HouseDataCapReachedError(cap);
  }
}

export type ScanUsage = { calls: number; costUsd: number; reused: number; llmCostUsd: number };

/**
 * What one scan cost: its AnyAPI lines and its language model lines, both read
 * from the moment the scan started. The arithmetic lives here and nowhere else.
 */
export async function usageSince(projectId: string, since: Date): Promise<ScanUsage> {
  const [data] = await db()
    .select({
      calls: sql<number>`count(*)::int`,
      costUsd: sql<string>`coalesce(sum(${usageLedger.costUsd}), 0)`,
      reused: sql<number>`count(*) filter (where ${usageLedger.reused})::int`,
    })
    .from(usageLedger)
    .where(and(eq(usageLedger.projectId, projectId), gte(usageLedger.at, since)));
  const [llm] = await db()
    .select({ costUsd: sql<string>`coalesce(sum(${llmUsage.costUsd}), 0)` })
    .from(llmUsage)
    .where(and(eq(llmUsage.projectId, projectId), gte(llmUsage.at, since)));
  return {
    calls: data?.calls ?? 0,
    costUsd: Number(data?.costUsd ?? 0),
    reused: data?.reused ?? 0,
    llmCostUsd: Number(llm?.costUsd ?? 0),
  };
}
