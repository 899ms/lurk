import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The one sweep a scorer change owes a project: every verdict an older scorer
 * made is judged again, and the leads table is made to agree with the answers.
 * Against a real database, because what the sweep finds and what it withdraws
 * are both queries.
 */

const generateStructured = vi.fn();

vi.mock("@/lib/llm", () => ({ generateStructured }));

const hasDatabase = !!process.env.DATABASE_URL;

function idsIn(prompt: string): string[] {
  return [...prompt.matchAll(/^id: (\S+)$/gm)].map((match) => match[1]);
}

describe.skipIf(!hasDatabase)("re-judging a project under a new scorer", () => {
  let db: typeof import("@/db").db;
  let schema: typeof import("@/db/schema");
  let runRescore: typeof import("@/lib/scan/rescore").runRescore;
  let hasStaleEvaluations: typeof import("@/lib/scan/rescore").hasStaleEvaluations;
  let SCORER_VERSION: string;
  let upsertPosts: typeof import("@/lib/reddit/store").upsertPosts;
  let eq: typeof import("drizzle-orm").eq;

  beforeEach(async () => {
    process.env.APP_ENCRYPTION_KEY ??= Buffer.alloc(32).toString("base64");
    ({ db } = await import("@/db"));
    schema = await import("@/db/schema");
    ({ runRescore, hasStaleEvaluations } = await import("@/lib/scan/rescore"));
    ({ SCORER_VERSION } = await import("@/lib/scan/evaluations"));
    ({ upsertPosts } = await import("@/lib/reddit/store"));
    ({ eq } = await import("drizzle-orm"));
    generateStructured.mockReset();
  });

  /** One project holding one stale verdict on one post, with or without a lead. */
  async function fixture(options: { lead: null | { status: string } }) {
    const [user] = await db()
      .insert(schema.users)
      .values({ clerkUserId: `test_${randomUUID()}` })
      .returning();
    const [project] = await db()
      .insert(schema.projects)
      .values({ userId: user.id, name: "Formcraft", solution: "A form builder." })
      .returning();
    const [post] = await upsertPosts([
      {
        id: `p${randomUUID().slice(0, 8)}`,
        subreddit: "SaaS",
        author: "asker",
        title: "Form question",
        body: "Our signup form needs conditional logic.",
        permalink: `/r/SaaS/comments/${randomUUID().slice(0, 6)}/form/`,
        score: 3,
        numComments: 2,
        createdUtc: Math.floor(Date.now() / 1000) - 3600,
      },
    ]);
    await db().insert(schema.leadEvaluations).values({
      projectId: project.id,
      postId: post.id,
      decision: "qualify",
      relationship: "buyer",
      needState: "open",
      fit: 4,
      intent: 3,
      engagement: 2,
      score: 80,
      reasonCodes: ["supported_open_need"],
      requirements: [],
      answerCoverage: "none",
      reason: "An older scorer said so.",
      profileVersion: project.profileVersion,
      contentHash: "stale",
      scorerVersion: "2026-01-01.0",
    });
    if (options.lead) {
      await db().insert(schema.leads).values({
        projectId: project.id,
        postId: post.id,
        score: 80,
        fit: 4,
        intent: 3,
        engagement: 2,
        stage: "solution_seeking",
        reason: "An older scorer said so.",
        matchedPhrase: "conditional logic",
        status: options.lead.status,
      });
    }
    return { project, post };
  }

  /** The model answers every id in the prompt with one assessment. */
  function answers(patch: Record<string, unknown>) {
    generateStructured.mockImplementation(async (input: { purpose: string; prompt: string }) => {
      if (input.purpose === "reading") {
        return {
          speaker: "buyer",
          asking: true,
          need: "a form builder",
          category: "form builder",
          constraints: [],
        };
      }
      return {
        items: idsIn(input.prompt).map((id) => ({
          id,
          relationship: "buyer",
          needState: "open",
          fit: 4,
          intent: 3,
          stage: "solution_seeking",
          decision: "qualify",
          reasonCode: "supported_open_need",
          needEvidence: { quote: "needs conditional logic" },
          reason: "Wants a form that branches.",
          ...patch,
        })),
      };
    });
  }

  async function leadsOf(projectId: string) {
    return db().select().from(schema.leads).where(eq(schema.leads.projectId, projectId));
  }

  it("finds the stale verdicts, re-judges them, and stamps the current scorer", async () => {
    const { project } = await fixture({ lead: { status: "new" } });
    expect(await hasStaleEvaluations(project.id)).toBe(true);
    answers({});

    const outcome = await runRescore(project.id, randomUUID());

    expect(outcome.judged).toBe(1);
    expect(outcome.unchanged).toBe(1);
    const [stored] = await db()
      .select()
      .from(schema.leadEvaluations)
      .where(eq(schema.leadEvaluations.projectId, project.id));
    expect(stored.scorerVersion).toBe(SCORER_VERSION);
    expect(stored.contentHash).toBe("stale");
    expect(await hasStaleEvaluations(project.id)).toBe(false);
  });

  it("takes back a lead whose verdict dropped to review", async () => {
    const { project } = await fixture({ lead: { status: "new" } });
    answers({ decision: "review", fit: 2 });

    const outcome = await runRescore(project.id, randomUUID());

    expect(outcome.demoted).toBe(1);
    expect(await leadsOf(project.id)).toHaveLength(0);
    const { listReviewItems } = await import("@/lib/leads");
    expect(await listReviewItems(project.id, 30)).toHaveLength(1);
  });

  it("takes back a lead whose verdict dropped to a rejection", async () => {
    const { project } = await fixture({ lead: { status: "new" } });
    answers({ relationship: "seller", decision: "reject", reasonCode: "seller_only", fit: 1 });

    const outcome = await runRescore(project.id, randomUUID());

    expect(outcome.demoted).toBe(1);
    expect(await leadsOf(project.id)).toHaveLength(0);
  });

  it("gives a post that now qualifies the lead it never had", async () => {
    const { project, post } = await fixture({ lead: null });
    answers({});

    const outcome = await runRescore(project.id, randomUUID());

    expect(outcome.promoted).toBe(1);
    const rows = await leadsOf(project.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].postId).toBe(post.id);
  });

  it("never touches a lead the person already acted on", async () => {
    for (const status of ["hidden", "not_fit", "resolved"]) {
      const { project } = await fixture({ lead: { status } });
      answers({ decision: "review", fit: 2 });

      const outcome = await runRescore(project.id, randomUUID());

      expect(outcome.demoted).toBe(0);
      const rows = await leadsOf(project.id);
      expect(rows).toHaveLength(1);
      expect(rows[0].status).toBe(status);
    }
  });

  it("judges nothing when every verdict is already current", async () => {
    const { project } = await fixture({ lead: { status: "new" } });
    await db()
      .update(schema.leadEvaluations)
      .set({ scorerVersion: SCORER_VERSION })
      .where(eq(schema.leadEvaluations.projectId, project.id));

    const outcome = await runRescore(project.id, randomUUID());

    expect(outcome).toEqual({ judged: 0, demoted: 0, promoted: 0, unchanged: 0 });
    expect(generateStructured).not.toHaveBeenCalled();
    expect(await hasStaleEvaluations(project.id)).toBe(false);
  });
});
