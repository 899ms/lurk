import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { usageLedger } from "@/db/schema";

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

/** Today's ledger for one project. */
export function usageTodayForProject(projectId: string): Promise<UsageToday> {
  return usageToday([projectId]);
}

/** Count of ledger lines ever written for a project, for empty-state copy. */
export async function ledgerLineCount(projectId: string): Promise<number> {
  const rows = await db()
    .select({ total: sql<number>`count(*)::int` })
    .from(usageLedger)
    .where(eq(usageLedger.projectId, projectId));
  return rows[0]?.total ?? 0;
}
