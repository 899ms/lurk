import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The scan's order of operations, against a real database with only AnyAPI and
 * the language model faked. These are the things a unit test of a pure function
 * cannot prove: that a verdict is stored once and reused, that leads are
 * committed before a comment fetch can fail, and that an author saying the
 * need is met takes their lead out of the feed.
 */

const generateStructured = vi.fn();
const fetchSearch = vi.fn();
const fetchSubredditPosts = vi.fn();
const fetchPost = vi.fn();
const fetchPostComments = vi.fn();
const fetchAuthorProfile = vi.fn();
const fetchSubredditDetails = vi.fn();

vi.mock("@/lib/llm", () => ({ generateStructured }));
vi.mock("@/lib/reddit/skus", () => ({
  fetchSearch,
  fetchSubredditPosts,
  fetchPost,
  fetchPostComments,
  fetchAuthorProfile,
  fetchSubredditDetails,
}));
vi.mock("@/lib/anyapi", () => ({
  clientForUser: async () => ({
    client: {},
    funding: "house" as const,
    call: async <T>(fn: () => Promise<T>) => ({ result: await fn(), requestId: null }),
  }),
  walletConnection: async () => null,
}));

const hasDatabase = !!process.env.DATABASE_URL;

type Assessment = Record<string, unknown>;

function assessment(id: string, patch: Assessment = {}): Assessment {
  return {
    id,
    relationship: "buyer",
    needState: "open",
    fit: 4,
    intent: 3,
    stage: "solution_seeking",
    requirements: [],
    answerCoverage: "none",
    unansweredAngle: null,
    decision: "qualify",
    reasonCodes: ["supported_open_need"],
    needEvidence: { quote: "needs conditional logic" },
    reason: "Wants a form that branches.",
    ...patch,
  };
}

function idsIn(prompt: string): string[] {
  return [...prompt.matchAll(/^id: (\S+)$/gm)].map((match) => match[1]);
}

describe.skipIf(!hasDatabase)("runScan against a database", () => {
  let db: typeof import("@/db").db;
  let schema: typeof import("@/db/schema");
  let runScan: typeof import("@/lib/scan/run").runScan;
  let upsertPosts: typeof import("@/lib/reddit/store").upsertPosts;
  let upsertComments: typeof import("@/lib/reddit/store").upsertComments;
  let listLeads: typeof import("@/lib/leads").listLeads;
  let listReviewItems: typeof import("@/lib/leads").listReviewItems;
  let eq: typeof import("drizzle-orm").eq;

  beforeEach(async () => {
    process.env.APP_ENCRYPTION_KEY ??= Buffer.alloc(32).toString("base64");
    ({ db } = await import("@/db"));
    schema = await import("@/db/schema");
    ({ runScan } = await import("@/lib/scan/run"));
    ({ upsertPosts, upsertComments } = await import("@/lib/reddit/store"));
    ({ listLeads, listReviewItems } = await import("@/lib/leads"));
    ({ eq } = await import("drizzle-orm"));
    generateStructured.mockReset();
    for (const mock of [fetchSearch, fetchSubredditPosts, fetchPost, fetchPostComments]) {
      mock.mockReset();
    }
    fetchSubredditPosts.mockResolvedValue({ value: [], reused: true, costUsd: 0 });
    fetchAuthorProfile.mockResolvedValue({ value: null, reused: true, costUsd: 0 });
    fetchPostComments.mockResolvedValue({ value: [], reused: true, costUsd: 0 });
  });

  async function project(threshold: number | null = null) {
    const [user] = await db()
      .insert(schema.users)
      .values({ clerkUserId: `test_${randomUUID()}` })
      .returning();
    const [row] = await db()
      .insert(schema.projects)
      .values({
        userId: user.id,
        name: "Formcraft",
        solution: "A form builder with conditional logic.",
        scoreThreshold: threshold,
      })
      .returning();
    await db()
      .insert(schema.projectKeywords)
      .values({ projectId: row.id, keyword: "form builder" });
    return row;
  }

  async function posts(count: number) {
    const now = Math.floor(Date.now() / 1000);
    return upsertPosts(
      Array.from({ length: count }, (_, index) => ({
        id: `p${randomUUID().slice(0, 8)}`,
        subreddit: "SaaS",
        author: `asker${index}`,
        title: `Form question ${index}`,
        body: "Our signup form needs conditional logic.",
        permalink: `/r/SaaS/comments/x${index}/form/`,
        score: 3,
        numComments: 2,
        createdUtc: now - 3600,
      })),
    );
  }

  /** Triage in a fixed order, then one assessment per id the prompt carries. */
  function model(order: string[], score: (id: string, prompt: string) => Assessment) {
    generateStructured.mockImplementation(async (input: { purpose: string; prompt: string }) => {
      if (input.purpose === "triage") {
        return {
          items: order.map((id, index) => ({
            id,
            disposition: "read",
            priority: index === 0 ? "high" : "medium",
            reasonCode: "explicit_ask",
            reason: "asks for a form tool",
          })),
        };
      }
      return { items: idsIn(input.prompt).map((id) => score(id, input.prompt)) };
    });
  }

  async function evaluations(projectId: string) {
    return db()
      .select()
      .from(schema.leadEvaluations)
      .where(eq(schema.leadEvaluations.projectId, projectId));
  }

  it("reads in triage order, stores every verdict, and reuses them on the next scan", async () => {
    const row = await project();
    const [first, second, third] = await posts(3);
    fetchSearch.mockResolvedValue({ value: [first, second, third], reused: true, costUsd: 0 });
    fetchPost.mockImplementation(async (_ctx: unknown, url: string) => ({
      value: [[first, second, third].find((post) => post.url === url)],
      reused: true,
      costUsd: 0,
    }));
    model([second.id, third.id, first.id], (id) =>
      id === second.id ? assessment(id) : assessment(id, { decision: "reject", fit: 0 }),
    );

    const outcome = await runScan(row.id, randomUUID());
    expect(fetchPost.mock.calls.map((call) => call[1])).toEqual([
      second.url,
      third.url,
      first.url,
    ]);
    expect(outcome.leads).toBe(1);
    const stored = await evaluations(row.id);
    expect(stored).toHaveLength(3);
    expect(stored.filter((one) => one.decision === "reject")).toHaveLength(2);

    generateStructured.mockClear();
    await runScan(row.id, randomUUID());
    expect(generateStructured).not.toHaveBeenCalled();
  });

  it("dates a held candidate with a real Date, not the raw column text", async () => {
    const row = await project();
    const [only] = await posts(1);
    fetchSearch.mockResolvedValue({ value: [only], reused: true, costUsd: 0 });
    fetchPost.mockResolvedValue({ value: [only], reused: true, costUsd: 0 });
    model([only.id], (id) => assessment(id, { decision: "review", fit: 2 }));

    await runScan(row.id, randomUUID());
    const held = await listReviewItems(row.id, 30);
    expect(held).toHaveLength(1);
    expect(held[0]?.createdAt).toBeInstanceOf(Date);
    expect(held[0]?.judgedAt).toBeInstanceOf(Date);
  });

  it("judges a candidate again once the product profile has changed", async () => {
    const row = await project();
    const [only] = await posts(1);
    fetchSearch.mockResolvedValue({ value: [only], reused: true, costUsd: 0 });
    fetchPost.mockResolvedValue({ value: [only], reused: true, costUsd: 0 });
    model([only.id], (id) => assessment(id, { decision: "reject", fit: 0 }));
    await runScan(row.id, randomUUID());

    await db()
      .update(schema.projects)
      .set({ profileVersion: 2, solution: "A form builder that also analyses answers." })
      .where(eq(schema.projects.id, row.id));
    generateStructured.mockClear();
    await runScan(row.id, randomUUID());
    expect(generateStructured).toHaveBeenCalled();
    expect(await evaluations(row.id)).toHaveLength(1);
  });

  it("keeps the leads it qualified when the comment fetch fails", async () => {
    const row = await project();
    const [only] = await posts(1);
    fetchSearch.mockResolvedValue({ value: [only], reused: true, costUsd: 0 });
    fetchPost.mockResolvedValue({ value: [only], reused: true, costUsd: 0 });
    fetchPostComments.mockRejectedValue(new Error("upstream is down"));
    model([only.id], (id) => assessment(id));

    await runScan(row.id, randomUUID());
    const rows = await db().select().from(schema.leads).where(eq(schema.leads.projectId, row.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].postId).toBe(only.id);
  });

  it("counts and writes one lead per qualified post and per qualified commenter", async () => {
    const row = await project();
    const [only] = await posts(1);
    fetchSearch.mockResolvedValue({ value: [only], reused: true, costUsd: 0 });
    fetchPost.mockResolvedValue({ value: [only], reused: true, costUsd: 0 });
    const commentId = `c${randomUUID().slice(0, 8)}`;
    fetchPostComments.mockImplementation(async () => ({
      value: await upsertComments(only.id, [
        {
          id: commentId,
          author: "buyer",
          body: "I need conditional logic on my own signup form too.",
          score: 2,
          url: "/r/SaaS/comments/x0/form/c9/",
          createdUtc: Math.floor(Date.now() / 1000),
        },
      ]),
      reused: false,
      costUsd: 0,
    }));
    model([only.id], (id) =>
      assessment(id, {
        needEvidence: { quote: id === commentId ? "conditional logic" : "conditional logic" },
      }),
    );

    const outcome = await runScan(row.id, randomUUID());
    const rows = await db().select().from(schema.leads).where(eq(schema.leads.projectId, row.id));
    expect(rows).toHaveLength(2);
    expect(outcome.leads).toBe(2);
    expect(rows.filter((one) => one.commentId === commentId)).toHaveLength(1);
  });

  it("takes a lead out of the feed once its author says the need is met", async () => {
    const row = await project();
    const [only] = await posts(1);
    fetchSearch.mockResolvedValue({ value: [only], reused: true, costUsd: 0 });
    fetchPost.mockResolvedValue({ value: [only], reused: true, costUsd: 0 });
    fetchPostComments.mockImplementation(async () => ({
      value: await upsertComments(only.id, [
        {
          id: `c${randomUUID().slice(0, 8)}`,
          author: only.author ?? "asker0",
          body: "We bought Formcraft, this is solved.",
          score: 2,
          url: "/r/SaaS/comments/x0/form/c1/",
          createdUtc: Math.floor(Date.now() / 1000),
        },
      ]),
      reused: false,
      costUsd: 0,
    }));
    model([only.id], (id, prompt) =>
      prompt.includes("this is solved")
        ? assessment(id, {
            needState: "resolved",
            decision: "reject",
            reasonCodes: ["resolved"],
            needEvidence: { quote: "We bought Formcraft, this is solved." },
          })
        : assessment(id),
    );

    await runScan(row.id, randomUUID());
    const rows = await db().select().from(schema.leads).where(eq(schema.leads.projectId, row.id));
    expect(rows[0].status).toBe("resolved");
    const feed = await listLeads(row.id, { status: "new", days: 30 });
    expect(feed).toHaveLength(0);
  });
});
