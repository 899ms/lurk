import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

/**
 * What the retention job is allowed to take away. A ranking thread is old by
 * definition, and a lead someone has not answered yet is still theirs, so a
 * post anything still points at outlives the window. Proven against a real
 * database, because the delete is the claim.
 */
describe.skipIf(!process.env.DATABASE_URL)("deleting expired posts", () => {
  async function fixture() {
    process.env.APP_ENCRYPTION_KEY ??= Buffer.alloc(32).toString("base64");
    const { db } = await import("@/db");
    const schema = await import("@/db/schema");
    const { upsertPosts } = await import("@/lib/reddit/store");
    const { deleteExpiredPosts } = await import("@/lib/retention");
    const { inArray } = await import("drizzle-orm");

    const [user] = await db()
      .insert(schema.users)
      .values({ clerkUserId: `test_${randomUUID()}` })
      .returning();
    const [project] = await db()
      .insert(schema.projects)
      .values({ userId: user.id, name: "HotelsAllow" })
      .returning();

    const longAgo = Math.floor(Date.now() / 1000) - 600 * 24 * 3600;
    const [led, ranked, loose] = await upsertPosts(
      ["led", "ranked", "loose"].map((role) => ({
        id: `p${randomUUID().slice(0, 8)}`,
        subreddit: "philly",
        author: "asker",
        title: `An old thread the ${role} case points at`,
        body: "Every hotel we called says 21+.",
        permalink: `/r/philly/comments/${role}/old/`,
        createdUtc: longAgo,
      })),
    );

    await db()
      .insert(schema.leads)
      .values({ projectId: project.id, postId: led.id, score: 80 });
    await db()
      .insert(schema.seoOpportunities)
      .values({ projectId: project.id, keyword: "hotels that take under 21", postId: ranked.id });

    return { db, schema, deleteExpiredPosts, inArray, led, ranked, loose };
  }

  it("keeps a post a lead or an SEO row still points at, and drops the rest", async () => {
    const { db, schema, deleteExpiredPosts, inArray, led, ranked, loose } = await fixture();

    await deleteExpiredPosts();

    const left = await db()
      .select({ id: schema.redditPosts.id })
      .from(schema.redditPosts)
      .where(inArray(schema.redditPosts.id, [led.id, ranked.id, loose.id]));
    expect(left.map((row) => row.id).sort()).toEqual([led.id, ranked.id].sort());
  });
});
