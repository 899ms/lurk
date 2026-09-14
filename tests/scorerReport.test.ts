import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";

/**
 * The report reads four tables and computes nothing anywhere else, so the only
 * thing worth proving is that the joins and the windows are right: a lead is
 * counted against the scorer version that produced it, a failed call is
 * counted, and a row outside the window is not.
 */

const hasDatabase = !!process.env.DATABASE_URL;

describe.skipIf(!hasDatabase)("the scorer report", () => {
  let db: typeof import("@/db").db;
  let schema: typeof import("@/db/schema");
  let scorerReport: typeof import("@/lib/scorerReport").scorerReport;
  let upsertPosts: typeof import("@/lib/reddit/store").upsertPosts;

  beforeEach(async () => {
    process.env.APP_ENCRYPTION_KEY ??= Buffer.alloc(32).toString("base64");
    ({ db } = await import("@/db"));
    schema = await import("@/db/schema");
    ({ scorerReport } = await import("@/lib/scorerReport"));
    ({ upsertPosts } = await import("@/lib/reddit/store"));
  });

  const DAY_MS = 24 * 60 * 60 * 1000;

  async function project() {
    const [user] = await db()
      .insert(schema.users)
      .values({ clerkUserId: `test_${randomUUID()}` })
      .returning();
    const [row] = await db()
      .insert(schema.projects)
      .values({ userId: user.id, name: "Formcraft" })
      .returning();
    return row;
  }

  async function post() {
    const [row] = await upsertPosts([
      {
        id: `p${randomUUID().slice(0, 8)}`,
        subreddit: "SaaS",
        author: "asker",
        title: "Form question",
        body: "Our signup form needs conditional logic.",
        permalink: `/r/SaaS/comments/${randomUUID().slice(0, 6)}/form/`,
        createdUtc: Math.floor(Date.now() / 1000) - 3600,
      },
    ]);
    return row;
  }

  async function verdict(
    projectId: string,
    postId: string,
    patch: { decision: string; scorerVersion: string; judgedAt?: Date },
  ) {
    await db().insert(schema.leadEvaluations).values({
      projectId,
      postId,
      decision: patch.decision,
      relationship: "buyer",
      needState: "open",
      fit: 4,
      intent: 3,
      engagement: 2,
      score: 80,
      reasonCodes: ["supported_open_need"],
      requirements: [],
      answerCoverage: "unknown",
      reason: "test",
      profileVersion: 1,
      contentHash: randomUUID(),
      scorerVersion: patch.scorerVersion,
      judgedAt: patch.judgedAt ?? new Date(),
    });
  }

  async function lead(
    projectId: string,
    postId: string,
    patch: { kind?: string; status?: string; notFitReason?: string },
  ) {
    await db()
      .insert(schema.leads)
      .values({
        projectId,
        postId,
        score: 80,
        fit: 4,
        intent: 3,
        engagement: 2,
        stage: "solution_seeking",
        reason: "test",
        matchedPhrase: "conditional logic",
        kind: patch.kind ?? "buyer",
        status: patch.status ?? "new",
        notFitReason: patch.notFitReason ?? null,
      });
  }

  it("counts verdicts and lanes against the scorer version that produced them", async () => {
    const row = await project();
    const [first, second, third] = [await post(), await post(), await post()];
    await verdict(row.id, first.id, { decision: "qualify", scorerVersion: "new" });
    await verdict(row.id, second.id, { decision: "review", scorerVersion: "new" });
    await verdict(row.id, third.id, { decision: "reject", scorerVersion: "old" });
    await lead(row.id, first.id, {});
    await lead(row.id, second.id, { kind: "context" });

    const report = await scorerReport({ projectIds: [row.id], days: 7 });

    expect(report.versions).toEqual([
      {
        scorerVersion: "new",
        qualify: 1,
        review: 1,
        reject: 0,
        buyerLeads: 1,
        contextLeads: 1,
      },
      { scorerVersion: "old", qualify: 0, review: 0, reject: 1, buyerLeads: 0, contextLeads: 0 },
    ]);
    expect(report.qualifiedLeads).toBe(1);
  });

  it("shows a person with no project nothing, not the whole instance", async () => {
    const row = await project();
    const first = await post();
    await verdict(row.id, first.id, { decision: "qualify", scorerVersion: "new" });
    await lead(row.id, first.id, {});

    const report = await scorerReport({ projectIds: [], days: 7 });

    expect(report.versions).toEqual([]);
    expect(report.qualifiedLeads).toBe(0);
    expect(report.calls).toEqual([]);
    expect(report.jobs).toEqual([]);
    expect((await scorerReport({ projectIds: null, days: 7 })).qualifiedLeads).toBeGreaterThanOrEqual(1);
  });

  it("reads a verdict older than the window as outside it", async () => {
    const row = await project();
    const old = await post();
    await verdict(row.id, old.id, {
      decision: "qualify",
      scorerVersion: "new",
      judgedAt: new Date(Date.now() - 30 * DAY_MS),
    });

    expect((await scorerReport({ projectIds: [row.id], days: 7 })).versions).toEqual([]);
    expect((await scorerReport({ projectIds: [row.id], days: 60 })).versions).toHaveLength(1);
  });

  it("says what people did with the leads, as a share of the ones they acted on", async () => {
    const row = await project();
    const [kept, missed, hidden] = [await post(), await post(), await post()];
    for (const one of [kept, missed, hidden]) {
      await verdict(row.id, one.id, { decision: "qualify", scorerVersion: "new" });
    }
    await lead(row.id, kept.id, {});
    await lead(row.id, missed.id, { status: "not_fit", notFitReason: "wrong audience" });
    await lead(row.id, hidden.id, { status: "hidden" });

    const report = await scorerReport({ projectIds: [row.id], days: 7 });

    const acted = report.feedback.filter((one) => one.status !== "new");
    expect(acted.map((one) => [one.status, one.notFitReason, one.leads, one.shareOfActed])).toEqual([
      ["hidden", null, 1, 50],
      ["not_fit", "wrong audience", 1, 50],
    ]);
    expect(report.feedback.find((one) => one.status === "new")?.shareOfActed).toBe(0);
  });

  it("counts a failed call, its dropped items and its retry", async () => {
    const row = await project();
    await db()
      .insert(schema.llmUsage)
      .values([
        {
          projectId: row.id,
          purpose: "score",
          inputTokens: 100,
          outputTokens: 50,
          costUsd: "0.000020",
          model: "muse",
          provider: "Fireworks",
          latencyMs: 1000,
          itemsAsked: 10,
          itemsAnswered: 9,
          attempt: 1,
        },
        {
          projectId: row.id,
          purpose: "score",
          inputTokens: 10,
          outputTokens: 5,
          costUsd: "0.000002",
          model: "muse",
          provider: "Fireworks",
          latencyMs: 3000,
          itemsAsked: 1,
          itemsAnswered: 1,
          attempt: 2,
        },
        {
          projectId: row.id,
          purpose: "score",
          inputTokens: 40,
          outputTokens: 0,
          costUsd: "0.000004",
          model: "muse",
          provider: "Fireworks",
          latencyMs: 500,
          schemaFailed: true,
          attempt: 1,
        },
      ]);

    const [health] = (await scorerReport({ projectIds: [row.id], days: 7 })).calls;

    expect(health).toMatchObject({
      purpose: "score",
      model: "muse",
      provider: "Fireworks",
      calls: 3,
      itemsDropped: 1,
      schemaFailures: 1,
      retries: 1,
    });
    expect(health.p50Ms).toBe(1000);
    expect(health.costUsd).toBeCloseTo(0.000026, 8);
  });

  it("counts the scans, first sweeps and rescores that finished, and their failures", async () => {
    const row = await project();
    const startedAt = new Date(Date.now() - 60_000);
    await db()
      .insert(schema.jobs)
      .values([
        { kind: "scan", projectId: row.id, startedAt, finishedAt: new Date() },
        { kind: "rescore", projectId: row.id, startedAt, finishedAt: new Date(), error: "boom" },
        { kind: "insights", projectId: row.id, startedAt, finishedAt: new Date() },
      ]);

    const report = await scorerReport({ projectIds: [row.id], days: 7 });

    expect(report.jobs.map((one) => [one.kind, one.runs, one.failures])).toEqual([
      ["rescore", 1, 1],
      ["scan", 1, 0],
    ]);
    expect(report.jobs[1].meanWallMs).toBeGreaterThan(50_000);
  });
});
