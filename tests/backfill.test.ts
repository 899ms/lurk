import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StoredPost } from "@/lib/reddit/store";

/**
 * The one-time backfill, against a real database with only AnyAPI and the
 * language model faked. What a unit test cannot prove: that a year of one
 * query is walked to its end and no further, that both orders and both kinds
 * of query are asked, that a post far outside the feed window still becomes a
 * lead, that a verdict already held is not bought again, that nothing is
 * opened with `reddit.post`, and that the Reddit SEO tab stays Google's.
 */

const generateStructured = vi.fn();
const fetchSearch = vi.fn();
const fetchSubredditPosts = vi.fn();
const fetchPost = vi.fn();
const fetchPostComments = vi.fn();
const fetchAuthorProfile = vi.fn();
const fetchSubredditDetails = vi.fn();
const fetchFeedThreads = vi.fn();

vi.mock("@/lib/llm", () => ({ generateStructured }));
vi.mock("@/lib/reddit/skus", () => ({
  fetchSearch,
  fetchSubredditPosts,
  fetchPost,
  fetchPostComments,
  fetchAuthorProfile,
  fetchSubredditDetails,
}));
vi.mock("@/lib/scan/serp", () => ({ fetchFeedThreads, FEED_TIMEFRAME: "7d" }));
vi.mock("@/lib/anyapi", () => ({
  clientForUser: async () => ({
    client: {},
    funding: "house" as const,
    call: async <T>(fn: () => Promise<T>) => ({ result: await fn(), requestId: null }),
  }),
  walletConnection: async () => null,
}));

const hasDatabase = !!process.env.DATABASE_URL;

const DAY_MS = 24 * 60 * 60 * 1000;

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

/** One search call as the test reads it: the query, the sort, the timeframe. */
type Call = { query: string; sort: string; timeframe: string; cursor: string | undefined };

function callsOf(): Call[] {
  return fetchSearch.mock.calls.map((call) => ({
    query: call[1] as string,
    sort: (call[2] as { sort?: string }).sort ?? "relevance",
    timeframe: (call[2] as { timeframe: string }).timeframe,
    cursor: (call[2] as { cursor?: string }).cursor,
  }));
}

/** The cadence each search was allowed to reuse a stored run under. */
function maxAgesOf(): number[] {
  return fetchSearch.mock.calls.map((call) => (call[0] as { maxAgeMs: number }).maxAgeMs);
}

describe.skipIf(!hasDatabase)("runBackfill against a database", () => {
  let db: typeof import("@/db").db;
  let schema: typeof import("@/db/schema");
  let runBackfill: typeof import("@/lib/scan/backfill").runBackfill;
  let upsertPosts: typeof import("@/lib/reddit/store").upsertPosts;
  let eq: typeof import("drizzle-orm").eq;

  beforeEach(async () => {
    process.env.APP_ENCRYPTION_KEY ??= Buffer.alloc(32).toString("base64");
    ({ db } = await import("@/db"));
    schema = await import("@/db/schema");
    ({ runBackfill } = await import("@/lib/scan/backfill"));
    ({ upsertPosts } = await import("@/lib/reddit/store"));
    ({ eq } = await import("drizzle-orm"));
    generateStructured.mockReset();
    for (const mock of [fetchSearch, fetchSubredditPosts, fetchPost, fetchPostComments]) {
      mock.mockReset();
    }
    fetchAuthorProfile.mockResolvedValue({ value: null, reused: true, costUsd: 0 });
  });

  async function project(phrasings: string[] = []) {
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
        problemPhrasings: phrasings,
      })
      .returning();
    await db()
      .insert(schema.projectKeywords)
      .values({ projectId: row.id, keyword: "form builder" });
    return row;
  }

  const BODY = "Our signup form needs conditional logic.";

  /** Search results as they arrive now: with their own text, and any age. */
  async function posts(count: number, ageDays = 1): Promise<StoredPost[]> {
    const created = Math.floor((Date.now() - ageDays * DAY_MS) / 1000);
    return upsertPosts(
      Array.from({ length: count }, (_, index) => ({
        id: `p${randomUUID().slice(0, 8)}`,
        subreddit: "SaaS",
        author: `asker${index}`,
        title: `Form question ${index}`,
        body: BODY,
        permalink: `/r/SaaS/comments/x${index}/form/`,
        score: 3,
        numComments: 2,
        createdUtc: created,
      })),
    );
  }

  /** Triage that wants every id read, then one assessment per id shown. */
  function model(score: (id: string) => Assessment = (id) => assessment(id)) {
    generateStructured.mockImplementation(async (input: { purpose: string; prompt: string }) => {
      if (input.purpose === "triage") {
        return {
          items: idsIn(input.prompt).map((id) => ({
            id,
            disposition: "read",
            priority: "medium",
            reasonCode: "explicit_ask",
            reason: "asks for a form tool",
          })),
        };
      }
      return { items: idsIn(input.prompt).map((id) => score(id)) };
    });
  }

  /** Every page of a walk, in order, replayed per query and sort. */
  function pages(list: { posts: StoredPost[]; nextCursor: string | null }[]) {
    const at = new Map<string, number>();
    fetchSearch.mockImplementation(
      async (_ctx: unknown, query: string, options: { sort?: string }) => {
        const key = `${query} ${options.sort ?? "relevance"}`;
        const index = at.get(key) ?? 0;
        at.set(key, index + 1);
        return { value: list[Math.min(index, list.length - 1)], reused: true, costUsd: 0 };
      },
    );
  }

  it("stops walking a query when Reddit stops handing out a cursor", async () => {
    const row = await project();
    pages([
      { posts: await posts(2), nextCursor: "page-2" },
      { posts: await posts(1), nextCursor: "page-3" },
      { posts: await posts(1), nextCursor: null },
    ]);
    model();

    await runBackfill(row.id);

    // Three pages per sort, and the third ends the listing.
    expect(callsOf()).toHaveLength(6);
    expect(callsOf().map((call) => call.cursor)).toEqual([
      undefined,
      "page-2",
      "page-3",
      undefined,
      "page-2",
      "page-3",
    ]);
  });

  it("keeps walking past a page that carried nothing new", async () => {
    const row = await project();
    const repeated = await posts(2);
    const behind = await posts(1);
    pages([
      { posts: repeated, nextCursor: "page-2" },
      // The sparse page Reddit's relevance sort returns mid-listing. Stopping
      // here is what lost 29 of 48 buyers on 2026-09-10.
      { posts: [], nextCursor: "page-3" },
      { posts: behind, nextCursor: null },
    ]);
    model();

    await runBackfill(row.id);

    expect(callsOf()).toHaveLength(6);
    const found = await db().select().from(schema.leads).where(eq(schema.leads.projectId, row.id));
    expect(found.map((lead) => lead.postId)).toContain(behind[0].id);
  });

  it("stops walking when the cursor it just followed comes back again", async () => {
    const row = await project();
    pages([
      { posts: await posts(1), nextCursor: "page-2" },
      { posts: await posts(1), nextCursor: "page-2" },
    ]);
    model();

    await runBackfill(row.id);

    expect(callsOf()).toHaveLength(4);
  });

  it("reuses no cached search, because a retry must not inherit a truncated walk", async () => {
    const row = await project();
    pages([{ posts: await posts(1), nextCursor: null }]);
    model();

    await runBackfill(row.id);

    expect(maxAgesOf()).toEqual([0, 0]);
  });

  it("asks both sorts of both the plan's keywords and the problem's phrasings", async () => {
    const row = await project(["forms that branch"]);
    pages([{ posts: await posts(1), nextCursor: null }]);
    model();

    await runBackfill(row.id);

    expect(callsOf().map((call) => `${call.query} | ${call.sort}`).sort()).toEqual([
      "form builder | new",
      "form builder | relevance",
      "forms that branch | new",
      "forms that branch | relevance",
    ]);
    expect(callsOf().every((call) => call.timeframe === "year")).toBe(true);
  });

  it("walks a query once when two keywords compile to it, and credits both", async () => {
    const row = await project();
    await db()
      .insert(schema.projectKeywords)
      .values([
        { projectId: row.id, keyword: '(form OR forms) AND (branch OR "conditional logic")' },
        { projectId: row.id, keyword: "(form OR forms) AND branch" },
      ]);
    pages([{ posts: await posts(1), nextCursor: null }]);
    model();

    await runBackfill(row.id);

    const branch = callsOf().filter((call) => call.query === "(form OR forms) AND branch");
    expect(branch.map((call) => call.sort).sort()).toEqual(["new", "relevance"]);
    const covered = await db()
      .select()
      .from(schema.projectKeywords)
      .where(eq(schema.projectKeywords.projectId, row.id));
    expect(covered.every((keyword) => keyword.lastCoveredAt !== null)).toBe(true);
  });

  it("asks a compiled keyword one constraint at a time, so none hides behind the others", async () => {
    const row = await project();
    await db()
      .insert(schema.projectKeywords)
      .values({ projectId: row.id, keyword: '(form OR forms) AND (branch OR "conditional logic")' });
    pages([{ posts: await posts(1), nextCursor: null }]);
    model();

    await runBackfill(row.id);

    const queries = [...new Set(callsOf().map((call) => call.query))].sort();
    expect(queries).toEqual([
      "(form OR forms) AND \"conditional logic\"",
      "(form OR forms) AND branch",
      "form builder",
    ]);
  });

  it("re-persists a found post that retention deleted mid-run, and still writes it", async () => {
    const row = await project();
    const [found] = await posts(1);
    // The retention job runs in the same queue and can delete an unreferenced
    // post while the sweep still holds it in memory.
    await db().delete(schema.redditPosts).where(eq(schema.redditPosts.id, found.id));
    pages([{ posts: [found], nextCursor: null }]);
    model();

    const outcome = await runBackfill(row.id);

    expect(outcome.leads).toBe(1);
    const [post] = await db()
      .select()
      .from(schema.redditPosts)
      .where(eq(schema.redditPosts.id, found.id));
    expect(post?.id).toBe(found.id);
    const leads = await db().select().from(schema.leads).where(eq(schema.leads.projectId, row.id));
    expect(leads.map((lead) => lead.postId)).toEqual([found.id]);
  });

  it("judges a post from long outside the feed window and writes it as a lead", async () => {
    const row = await project();
    const [old] = await posts(1, 200);
    pages([{ posts: [old], nextCursor: null }]);
    model();

    const outcome = await runBackfill(row.id);

    expect(outcome.judged).toBe(1);
    const leads = await db().select().from(schema.leads).where(eq(schema.leads.projectId, row.id));
    expect(leads.map((lead) => [lead.postId, lead.kind])).toEqual([[old.id, "buyer"]]);
  });

  it("never judges a post it already holds a verdict on", async () => {
    const row = await project();
    pages([{ posts: await posts(2), nextCursor: null }]);
    model();

    await runBackfill(row.id);
    expect(generateStructured).toHaveBeenCalled();

    generateStructured.mockClear();
    const second = await runBackfill(row.id);
    expect(generateStructured).not.toHaveBeenCalled();
    expect(second.judged).toBe(0);
  });

  it("opens no post, because search carried the text", async () => {
    const row = await project(["forms that branch"]);
    pages([{ posts: await posts(3), nextCursor: null }]);
    model();

    await runBackfill(row.id);

    expect(fetchPost).not.toHaveBeenCalled();
  });

  it("writes no Reddit SEO row, which stays Google's alone", async () => {
    const row = await project(["forms that branch"]);
    pages([{ posts: await posts(2), nextCursor: null }]);
    model();

    await runBackfill(row.id);

    const seo = await db()
      .select()
      .from(schema.seoOpportunities)
      .where(eq(schema.seoOpportunities.projectId, row.id));
    expect(seo).toHaveLength(0);
  });
});
