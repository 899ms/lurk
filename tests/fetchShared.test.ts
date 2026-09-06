import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isFreshEnough } from "@/lib/reddit/fetch";

describe("reuse decision", () => {
  const now = new Date("2026-09-05T12:00:00Z");

  it("reuses a run inside the caller's cadence window", () => {
    const fetchedAt = new Date(now.getTime() - 30 * 60 * 1000);
    expect(isFreshEnough(fetchedAt, 60 * 60 * 1000, now)).toBe(true);
  });

  it("refetches once the window has passed", () => {
    const fetchedAt = new Date(now.getTime() - 90 * 60 * 1000);
    expect(isFreshEnough(fetchedAt, 60 * 60 * 1000, now)).toBe(false);
  });

  it("treats a run exactly at the boundary as fresh", () => {
    const fetchedAt = new Date(now.getTime() - 60 * 60 * 1000);
    expect(isFreshEnough(fetchedAt, 60 * 60 * 1000, now)).toBe(true);
  });
});

/**
 * The reuse path touches four tables, so it is proven against a real database
 * with only the AnyAPI client faked. It skips when DATABASE_URL is absent.
 */
describe.skipIf(!process.env.DATABASE_URL)("fetchShared against a database", () => {
  it("calls AnyAPI once and reuses the run for the second caller", async () => {
    process.env.APP_ENCRYPTION_KEY ??= Buffer.alloc(32).toString("base64");
    const { db } = await import("@/db");
    const { projects, redditPosts, searchRuns, usageLedger, users } = await import("@/db/schema");
    const { fetchSearch } = await import("@/lib/reddit/skus");
    const { and, eq } = await import("drizzle-orm");

    const [user] = await db()
      .insert(users)
      .values({ clerkUserId: `test_${randomUUID()}` })
      .returning();
    const [project] = await db()
      .insert(projects)
      .values({ userId: user.id, name: "Test project" })
      .returning();

    const query = `reuse test ${randomUUID()}`;
    let calls = 0;
    const post = {
      id: `t3_${randomUUID().slice(0, 8)}`,
      title: "Anyone using a form builder that does not charge per response",
      author: "someone",
      score: 12,
      numComments: 4,
      permalink: "/r/SaaS/comments/abc123/anyone_using_a_form_builder/",
      url: "https://example.com",
      createdUtc: Math.floor(Date.now() / 1000),
      subreddit: "SaaS",
    };
    const funded = {
      funding: "house" as const,
      lastRequestId: () => "test-request-id",
      client: {
        reddit: {
          search: async () => {
            calls += 1;
            return {
              output: { found: true as const, data: { posts: [post], nextCursor: null } },
              costUsd: 0.0012,
            };
          },
        },
      },
    };
    const ctx = {
      projectId: project.id,
      funded: funded as unknown as Parameters<typeof fetchSearch>[0]["funded"],
      maxAgeMs: 60 * 60 * 1000,
    };

    const first = await fetchSearch(ctx, query, "day");
    const second = await fetchSearch(ctx, query, "day");

    expect(calls).toBe(1);
    expect(first.reused).toBe(false);
    expect(first.costUsd).toBe(0.0012);
    expect(second.reused).toBe(true);
    expect(second.costUsd).toBe(0);
    expect(second.value.map((row) => row.title)).toEqual([post.title]);

    const ledger = await db()
      .select()
      .from(usageLedger)
      .where(eq(usageLedger.projectId, project.id));
    expect(ledger).toHaveLength(2);
    expect(ledger.filter((row) => row.reused)).toHaveLength(1);

    await db().delete(users).where(eq(users.id, user.id));
    await db()
      .delete(searchRuns)
      .where(and(eq(searchRuns.kind, "keyword"), eq(searchRuns.normalizedQuery, query)));
    await db().delete(redditPosts).where(eq(redditPosts.id, post.id.replace("t3_", "")));
  });
});
