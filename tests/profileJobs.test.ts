import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * What creating a project puts on the queue. The first screens a person sees
 * are filled by jobs, not by the request that created the project, so the
 * order these are queued in is the order the app comes alive in: the weekly
 * discovery delta, the one-time year backfill that fills the leads feed, the
 * Google pass that fills the Reddit SEO tab, then the scan that fills the
 * competitors tab.
 */

const enqueueJob = vi.fn(async (kind: string, projectId: string | null, runAt?: Date) => ({
  id: `job-${kind}`,
  projectId,
  runAt,
}));
const generateStructured = vi.fn();
const runDiscovery = vi.fn();

vi.mock("@/jobs/enqueue", () => ({ enqueueJob, writeProgress: vi.fn() }));
vi.mock("@/lib/llm", () => ({ generateStructured }));
vi.mock("@/lib/discovery/run", () => ({
  runDiscovery,
  discoveryBudget: () => ({ refreshDays: 7 }),
}));
vi.mock("@/lib/anyapi", () => ({
  clientForUser: async () => ({
    client: {
      web: {
        scrape: async () => ({
          costUsd: 0,
          output: { found: true, data: { url: "https://formcraft.test", title: "Formcraft", description: "Forms", markdown: "Forms that branch." } },
        }),
      },
    },
    funding: "house" as const,
    call: async <T>(fn: () => Promise<T>) => ({ result: await fn(), requestId: null }),
  }),
  walletConnection: async () => null,
}));

const profile = {
  name: "Formcraft",
  pain: "Forms cannot branch.",
  solution: "A form builder with conditional logic.",
  targetUsers: "Ops teams",
  capabilities: ["branching"],
  exclusions: [],
  notBuyers: ["students wanting a free plan"],
  serviceGeography: "Worldwide",
  destinations: [],
  problemPhrasings: ["forms that branch"],
  budgetFit: "Under $50 a month",
};

describe.skipIf(!process.env.DATABASE_URL)("the jobs a new project starts with", () => {
  beforeEach(() => {
    process.env.APP_ENCRYPTION_KEY ??= Buffer.alloc(32).toString("base64");
    enqueueJob.mockClear();
    generateStructured.mockReset();
    generateStructured.mockResolvedValue(profile);
  });

  it("queues the discovery delta, the backfill, the SEO refresh and the competitor scan", async () => {
    const { db } = await import("@/db");
    const schema = await import("@/db/schema");
    const { buildProfile } = await import("@/lib/profile");
    const [user] = await db()
      .insert(schema.users)
      .values({ clerkUserId: `test_${randomUUID()}` })
      .returning();
    const [row] = await db()
      .insert(schema.projects)
      .values({ userId: user.id, name: "Formcraft" })
      .returning();

    await buildProfile(row.id, user.id, "https://formcraft.test");

    expect(enqueueJob.mock.calls.map((call) => call[0])).toEqual([
      "discovery_refresh",
      "backfill",
      "seo_refresh",
      "competitor_scan",
    ]);
    expect(enqueueJob.mock.calls.map((call) => call[1])).toEqual([
      row.id,
      row.id,
      row.id,
      row.id,
    ]);
  });
});
