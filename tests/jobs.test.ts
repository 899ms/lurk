import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { captureRequestId, withRequestId } from "@/lib/anyapi";
import { HEARTBEAT_MS, LEASE_MS } from "@/jobs/lease";
import { LlmTimeoutError, LLM_CALL_TIMEOUT_MS, withCallTimeout } from "@/lib/llm";

describe("request identity", () => {
  it("gives each call its own request id and never the previous one", async () => {
    const withHeader = await withRequestId(async () => {
      captureRequestId(new Response(null, { headers: { "x-anyapi-request-id": "req-1" } }));
      return "first";
    });
    const withoutHeader = await withRequestId(async () => {
      captureRequestId(new Response(null));
      return "second";
    });

    expect(withHeader).toEqual({ result: "first", requestId: "req-1" });
    expect(withoutHeader).toEqual({ result: "second", requestId: null });
  });

  it("keeps two calls in flight at once apart", async () => {
    const slow = withRequestId(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      captureRequestId(new Response(null, { headers: { "x-anyapi-request-id": "slow" } }));
      return "slow";
    });
    const fast = await withRequestId(async () => {
      captureRequestId(new Response(null, { headers: { "x-anyapi-request-id": "fast" } }));
      return "fast";
    });

    expect(fast.requestId).toBe("fast");
    expect((await slow).requestId).toBe("slow");
  });
});

describe("the model call deadline", () => {
  it("cuts a call off well inside the lease it must not outlive", () => {
    expect(LLM_CALL_TIMEOUT_MS).toBe(HEARTBEAT_MS);
    expect(LLM_CALL_TIMEOUT_MS).toBeLessThan(LEASE_MS);
  });

  it("turns a call that never answers into a plain failure", async () => {
    const hang = (signal: AbortSignal) =>
      new Promise<never>((_, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason));
      });

    await expect(withCallTimeout(hang, 5)).rejects.toThrow(/did not answer within/);
    expect(new LlmTimeoutError(LLM_CALL_TIMEOUT_MS).message).toBe(
      "The language model did not answer within 3 minutes. The scan stopped and will run again.",
    );
  });

  it("lets a call that answers in time through untouched", async () => {
    await expect(withCallTimeout(async () => "answer", 1000)).resolves.toBe("answer");
  });
});

/**
 * The queue's invariants are SQL, so they are proven against a real database.
 * Every test row is dated 2000 and every claim is made as of NOW, also in 2000,
 * so no row this instance already holds is due and none of them are touched.
 */
describe.skipIf(!process.env.DATABASE_URL)("the job queue against a database", () => {
  const LONG_AGO = new Date("2000-01-01T00:00:00Z");
  const NOW = new Date("2000-01-01T01:00:00Z");

  /** Rows a previous run left behind are the only jobs this old. */
  beforeAll(async () => {
    const { db } = await import("@/db");
    const { jobs } = await import("@/db/schema");
    const { lt } = await import("drizzle-orm");
    await db().delete(jobs).where(lt(jobs.runAt, new Date("2001-01-01T00:00:00Z")));
  });

  async function fixture() {
    const { db } = await import("@/db");
    const { jobs, projects, users } = await import("@/db/schema");
    const [user] = await db()
      .insert(users)
      .values({ clerkUserId: `test_${randomUUID()}` })
      .returning();
    const [project] = await db()
      .insert(projects)
      .values({ userId: user.id, name: "Queue test" })
      .returning();
    return { db, jobs, projects, users, user, project };
  }

  it("re-queues a scan whose run failed, and records the reason not a stack", async () => {
    const { db, jobs, users, user, project } = await fixture();
    const { JOB_HANDLERS } = await import("@/jobs/registry");
    const { runClaimedJob } = await import("@/jobs/runner");
    const { and, eq, isNull } = await import("drizzle-orm");

    const [claimed] = await db()
      .insert(jobs)
      .values({ kind: "scan", projectId: project.id, runAt: LONG_AGO, startedAt: new Date() })
      .returning();
    const original = JOB_HANDLERS.scan;
    const selfHosted = process.env.SELF_HOSTED;
    process.env.SELF_HOSTED = "false";
    JOB_HANDLERS.scan = async () => {
      throw new Error("Reddit returned 502");
    };
    try {
      await runClaimedJob(claimed);
    } finally {
      JOB_HANDLERS.scan = original;
      if (selfHosted === undefined) {
        delete process.env.SELF_HOSTED;
      } else {
        process.env.SELF_HOSTED = selfHosted;
      }
    }

    const [finished] = await db().select().from(jobs).where(eq(jobs.id, claimed.id));
    expect(finished.finishedAt).not.toBeNull();
    expect(finished.error).toBe("Reddit returned 502");

    const pending = await db()
      .select()
      .from(jobs)
      .where(and(eq(jobs.kind, "scan"), eq(jobs.projectId, project.id), isNull(jobs.startedAt)));
    expect(pending).toHaveLength(1);
    const waitHours = (pending[0].runAt.getTime() - Date.now()) / (60 * 60 * 1000);
    expect(waitHours).toBeGreaterThan(5);
    expect(waitHours).toBeLessThanOrEqual(6);

    await db().delete(users).where(eq(users.id, user.id));
  });

  it("keeps advancing the lease of a job that is still running", async () => {
    const { db, jobs, users, user, project } = await fixture();
    const { JOB_HANDLERS } = await import("@/jobs/registry");
    const { runClaimedJob } = await import("@/jobs/runner");
    const { eq } = await import("drizzle-orm");

    const stamp = new Date();
    const [claimed] = await db()
      .insert(jobs)
      .values({ kind: "noop", projectId: project.id, runAt: LONG_AGO, startedAt: stamp })
      .returning();
    const original = JOB_HANDLERS.noop;
    let advanced: Date | null = null;
    vi.useFakeTimers({ toFake: ["setInterval"] });
    JOB_HANDLERS.noop = async () => {
      await vi.advanceTimersByTimeAsync(HEARTBEAT_MS);
      for (let attempt = 0; attempt < 100 && !advanced; attempt += 1) {
        const [row] = await db().select().from(jobs).where(eq(jobs.id, claimed.id));
        if (row.startedAt && row.startedAt.getTime() > stamp.getTime()) {
          advanced = row.startedAt;
        } else {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }
    };
    try {
      await runClaimedJob(claimed);
    } finally {
      JOB_HANDLERS.noop = original;
      vi.useRealTimers();
    }

    expect(advanced).not.toBeNull();
    const [finished] = await db().select().from(jobs).where(eq(jobs.id, claimed.id));
    expect(finished.finishedAt).not.toBeNull();
    expect(finished.error).toBeNull();

    await db().delete(users).where(eq(users.id, user.id));
  });

  it("writes nothing once another worker has taken the job away", async () => {
    const { db, jobs, users, user, project } = await fixture();
    const { JOB_HANDLERS } = await import("@/jobs/registry");
    const { runClaimedJob } = await import("@/jobs/runner");
    const { and, eq, isNull } = await import("drizzle-orm");

    const [claimed] = await db()
      .insert(jobs)
      .values({ kind: "scan", projectId: project.id, runAt: LONG_AGO, startedAt: new Date() })
      .returning();
    const original = JOB_HANDLERS.scan;
    JOB_HANDLERS.scan = async () => {
      await db()
        .update(jobs)
        .set({ startedAt: new Date(Date.now() + 1000) })
        .where(eq(jobs.id, claimed.id));
      throw new Error("Reddit returned 502");
    };
    try {
      await runClaimedJob(claimed);
    } finally {
      JOB_HANDLERS.scan = original;
    }

    const [row] = await db().select().from(jobs).where(eq(jobs.id, claimed.id));
    expect(row.finishedAt).toBeNull();
    expect(row.error).toBeNull();
    const pending = await db()
      .select()
      .from(jobs)
      .where(and(eq(jobs.kind, "scan"), eq(jobs.projectId, project.id), isNull(jobs.startedAt)));
    expect(pending).toHaveLength(0);

    await db().delete(users).where(eq(users.id, user.id));
  });

  it("reclaims a job whose lease expired and leaves a live one alone", async () => {
    const { db, jobs, users, user, project } = await fixture();
    const { claimNextJob } = await import("@/jobs/runner");
    const { eq } = await import("drizzle-orm");

    const [live] = await db()
      .insert(jobs)
      .values({
        kind: "noop",
        projectId: project.id,
        runAt: LONG_AGO,
        startedAt: new Date(NOW.getTime() - LEASE_MS / 2),
      })
      .returning();
    expect(await claimNextJob(NOW)).toBeNull();

    await db()
      .update(jobs)
      .set({ startedAt: new Date(NOW.getTime() - LEASE_MS - 1000) })
      .where(eq(jobs.id, live.id));
    const reclaimed = await claimNextJob(NOW);
    expect(reclaimed?.id).toBe(live.id);

    await db().delete(users).where(eq(users.id, user.id));
  });

  it("never claims a second job of a project that is already running one", async () => {
    const { db, jobs, projects, users, user, project } = await fixture();
    const { claimNextJob } = await import("@/jobs/runner");
    const { eq } = await import("drizzle-orm");

    const [other] = await db()
      .insert(projects)
      .values({ userId: user.id, name: "Other queue test" })
      .returning();
    await db()
      .insert(jobs)
      .values({ kind: "noop", projectId: project.id, runAt: LONG_AGO, startedAt: NOW });
    const [blocked] = await db()
      .insert(jobs)
      .values({ kind: "noop", projectId: project.id, runAt: new Date(LONG_AGO.getTime() + 1000) })
      .returning();
    const [free] = await db()
      .insert(jobs)
      .values({ kind: "noop", projectId: other.id, runAt: new Date(LONG_AGO.getTime() + 2000) })
      .returning();

    const claimed = await claimNextJob(NOW);
    expect(claimed?.id).not.toBe(blocked.id);
    expect(claimed?.id).toBe(free.id);

    await db().delete(users).where(eq(users.id, user.id));
  });

  it("seeds a scan for a project that has none waiting", async () => {
    const { db, jobs, users, user, project } = await fixture();
    const { seedProjectScans } = await import("@/jobs/scheduler");
    const { and, eq, inArray, notInArray } = await import("drizzle-orm");

    const before = await db().select({ id: jobs.id }).from(jobs).where(eq(jobs.kind, "scan"));
    const beforeIds = before.map((row) => row.id);
    await seedProjectScans();
    const added = await db()
      .select()
      .from(jobs)
      .where(
        beforeIds.length === 0
          ? eq(jobs.kind, "scan")
          : and(eq(jobs.kind, "scan"), notInArray(jobs.id, beforeIds)),
      );

    expect(added.filter((row) => row.projectId === project.id)).toHaveLength(1);

    await db()
      .delete(jobs)
      .where(inArray(jobs.id, added.map((row) => row.id)));
    await db().delete(users).where(eq(users.id, user.id));
  });
});
