import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verdictSentence, type ScanReport } from "@/lib/scan/report";

/**
 * What a window of scanning reports, and what the page says when that report is
 * all the user has. The counts are SQL, so they are answered against a real
 * database; the sentence is a pure function of the counts.
 */

const hasDatabase = !!process.env.DATABASE_URL;

const DAY_MS = 24 * 60 * 60 * 1000;

describe.skipIf(!hasDatabase)("counting one window of scanning", () => {
  async function fixture() {
    process.env.APP_ENCRYPTION_KEY ??= Buffer.alloc(32).toString("base64");
    const { db } = await import("@/db");
    const schema = await import("@/db/schema");
    const [user] = await db()
      .insert(schema.users)
      .values({ clerkUserId: `test_${randomUUID()}` })
      .returning();
    const [project] = await db()
      .insert(schema.projects)
      .values({ userId: user.id, name: "Formcraft" })
      .returning();

    async function post(ageDays: number) {
      const [row] = await db()
        .insert(schema.redditPosts)
        .values({
          id: `p${randomUUID().slice(0, 8)}`,
          subreddit: "SaaS",
          author: "asker",
          title: "Form question",
          url: `https://www.reddit.com/r/SaaS/comments/${randomUUID().slice(0, 6)}/form/`,
          createdAt: new Date(Date.now() - ageDays * DAY_MS),
        })
        .returning();
      return row;
    }

    async function judged(decision: string, ageDays: number) {
      const row = await post(ageDays);
      await db()
        .insert(schema.leadEvaluations)
        .values({
          projectId: project.id,
          postId: row.id,
          decision,
          relationship: "self",
          needState: "open",
          engagement: 1,
          score: 60,
          reasonCodes: [],
          requirements: [],
          answerCoverage: "none",
          reason: "test",
          profileVersion: 1,
          contentHash: randomUUID(),
          scorerVersion: "test",
          judgedAt: new Date(Date.now() - ageDays * DAY_MS),
        });
      return row;
    }

    async function found(postId: string, sourceKind: string, ageDays: number) {
      await db()
        .insert(schema.candidateSources)
        .values({
          projectId: project.id,
          postId,
          sourceKind,
          sourceKey: "form builder",
          firstSeenAt: new Date(Date.now() - ageDays * DAY_MS),
        });
    }

    return { project, judged, found };
  }

  it("counts the verdicts inside the window and leaves the older one out", async () => {
    const { project, judged } = await fixture();
    await judged("qualify", 1);
    await judged("review", 2);
    await judged("reject", 3);
    await judged("reject", 40);
    const { scanReport } = await import("@/lib/scan/report");

    expect(await scanReport(project.id, 7)).toMatchObject({
      read: 3,
      qualified: 1,
      held: 1,
      rejected: 1,
    });
    expect(await scanReport(project.id, "all")).toMatchObject({ read: 4, rejected: 2 });
  });

  it("counts a post found four ways once, and only inside the window", async () => {
    const { project, judged, found } = await fixture();
    const inside = await judged("qualify", 1);
    const outside = await judged("reject", 40);
    await found(inside.id, "search", 1);
    await found(inside.id, "listing", 1);
    await found(outside.id, "search", 40);
    const { scanReport } = await import("@/lib/scan/report");

    expect((await scanReport(project.id, 7)).candidates).toBe(1);
    expect((await scanReport(project.id, "all")).candidates).toBe(2);
  });
});

describe("what the page says about a window", () => {
  function report(patch: Partial<ScanReport>): ScanReport {
    return { candidates: 0, read: 0, qualified: 0, held: 0, rejected: 0, ...patch };
  }

  it("says nothing has been read when no candidate has a verdict", () => {
    expect(verdictSentence(report({ candidates: 12 }), 0)).toBe(
      "No scan has read this window yet.",
    );
  });

  it("says Reddit talks about this and nobody asked to buy, with the counts", () => {
    const sentence = verdictSentence(
      report({ candidates: 112, read: 30, qualified: 0, held: 2, rejected: 28 }),
      0,
    );
    expect(sentence).toBe(
      "Reddit talks about this, but nobody in this window asked to buy. We read 30 posts, 0 cleared the bar and 2 held for review.",
    );
  });

  it("gives the counts alone once there are leads to show", () => {
    const sentence = verdictSentence(
      report({ candidates: 112, read: 30, qualified: 4, held: 2, rejected: 24 }),
      4,
    );
    expect(sentence).toBe("We read 30 posts, 4 cleared the bar and 2 held for review.");
  });

  it("counts a single read post as one post", () => {
    expect(verdictSentence(report({ read: 1, qualified: 1 }), 1)).toBe(
      "We read 1 post, 1 cleared the bar and 0 held for review.",
    );
  });
});
