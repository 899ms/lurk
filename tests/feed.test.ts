import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

/**
 * What the feed decides when it is read, rather than when the scan ran: the
 * project's own minimum score, and how old a comment lead is. Both are answered
 * against a real database, because both are SQL.
 */

const hasDatabase = !!process.env.DATABASE_URL;

const DAY_MS = 24 * 60 * 60 * 1000;

describe.skipIf(!hasDatabase)("the feed at read time", () => {
  async function fixture(threshold: number | null) {
    process.env.APP_ENCRYPTION_KEY ??= Buffer.alloc(32).toString("base64");
    const { db } = await import("@/db");
    const schema = await import("@/db/schema");
    const [user] = await db()
      .insert(schema.users)
      .values({ clerkUserId: `test_${randomUUID()}` })
      .returning();
    const [project] = await db()
      .insert(schema.projects)
      .values({ userId: user.id, name: "Formcraft", scoreThreshold: threshold })
      .returning();
    const [post] = await db()
      .insert(schema.redditPosts)
      .values({
        id: `p${randomUUID().slice(0, 8)}`,
        subreddit: "SaaS",
        author: "asker",
        title: "Form question",
        url: "https://www.reddit.com/r/SaaS/comments/x/form/",
        createdAt: new Date(Date.now() - 10 * DAY_MS),
      })
      .returning();
    return { db, schema, project, post };
  }

  it("hides a lead under the project's minimum score and shows it when that moves", async () => {
    const { db, schema, project, post } = await fixture(70);
    const { listLeads } = await import("@/lib/leads");
    const { eq } = await import("drizzle-orm");
    await db()
      .insert(schema.leads)
      .values({ projectId: project.id, postId: post.id, score: 60, stage: "comparing" });

    expect(await listLeads(project.id, { status: "new", days: 30 })).toHaveLength(0);
    await db()
      .update(schema.projects)
      .set({ scoreThreshold: 50 })
      .where(eq(schema.projects.id, project.id));
    expect(await listLeads(project.id, { status: "new", days: 30 })).toHaveLength(1);
  });

  it("dates a comment lead by the comment, not by the thread it was left in", async () => {
    const { db, schema, project, post } = await fixture(null);
    const { listLeads } = await import("@/lib/leads");
    const [comment] = await db()
      .insert(schema.redditComments)
      .values({
        id: `c${randomUUID().slice(0, 8)}`,
        postId: post.id,
        author: "buyer",
        body: "I need the same thing for my own signup form.",
        permalink: "https://www.reddit.com/r/SaaS/comments/x/form/c1/",
        createdAt: new Date(Date.now() - 60 * 60 * 1000),
      })
      .returning();
    await db()
      .insert(schema.leads)
      .values([
        { projectId: project.id, postId: post.id, score: 60, stage: "comparing" },
        {
          projectId: project.id,
          postId: post.id,
          commentId: comment.id,
          score: 60,
          stage: "comparing",
        },
      ]);

    const today = await listLeads(project.id, { status: "new", days: 1 });
    expect(today.map((lead) => lead.commentId)).toEqual([comment.id]);
    expect(await listLeads(project.id, { status: "new", days: 30 })).toHaveLength(2);
  });
});

describe.skipIf(!hasDatabase)("the house data cap", () => {
  it("refuses a house-funded call that stores no shared run", async () => {
    process.env.APP_ENCRYPTION_KEY ??= Buffer.alloc(32).toString("base64");
    const { db } = await import("@/db");
    const schema = await import("@/db/schema");
    const { fetchKeywordVolumes } = await import("@/lib/seo/fetch");
    const { HouseDataCapReachedError } = await import("@/lib/usage");
    const [user] = await db()
      .insert(schema.users)
      .values({ clerkUserId: `test_${randomUUID()}` })
      .returning();
    const [project] = await db()
      .insert(schema.projects)
      .values({ userId: user.id, name: "Formcraft" })
      .returning();

    let calls = 0;
    const funded = {
      funding: "house" as const,
      client: {
        seo: {
          searchVolume: async () => {
            calls += 1;
            return { output: { found: true, data: { keywords: [] } }, costUsd: 0.05 };
          },
        },
      },
      call: async <T>(fn: () => Promise<T>) => ({ result: await fn(), requestId: null }),
    };
    const previous = process.env.HOUSE_DATA_CAP_USD_PER_DAY;
    process.env.HOUSE_DATA_CAP_USD_PER_DAY = "0";
    try {
      await expect(
        fetchKeywordVolumes(
          // The stub client only has the one method this call reaches.
          { projectId: project.id, funded, maxAgeMs: 0 } as never,
          ["form builder"],
        ),
      ).rejects.toBeInstanceOf(HouseDataCapReachedError);
    } finally {
      process.env.HOUSE_DATA_CAP_USD_PER_DAY = previous;
    }
    expect(calls).toBe(0);
  });
});
