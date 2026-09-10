import { describe, expect, it, vi } from "vitest";

/**
 * A year-wide sweep asks the same query twice, once by relevance and once by
 * new. The two orders are different pages of the same query, so the sort has to
 * reach both the stored run key and the upstream call; keyed alike, the second
 * sweep would be served the first one's page and see nothing new.
 */

type SharedInput = {
  sort?: string | null;
  timeframe?: string | null;
  run: () => Promise<{ data: unknown; costUsd: number; nextCursor?: string | null }>;
};

const calls: SharedInput[] = [];

vi.mock("@/lib/reddit/fetch", async () => {
  const actual = await vi.importActual<typeof import("@/lib/reddit/fetch")>("@/lib/reddit/fetch");
  return {
    ...actual,
    fetchShared: async (input: SharedInput) => {
      calls.push(input);
      await input.run();
      return { value: { posts: [], nextCursor: null }, reused: false, costUsd: 0 };
    },
  };
});

describe("fetchSearch keys and asks for its sort", () => {
  async function search(options: {
    timeframe: "day" | "week" | "month" | "year";
    sort?: "relevance" | "new";
  }) {
    const { fetchSearch } = await import("@/lib/reddit/skus");
    const asked: Record<string, unknown>[] = [];
    const ctx = {
      projectId: "p",
      maxAgeMs: 0,
      funded: {
        funding: "house" as const,
        call: async <T>(fn: () => Promise<T>) => ({ result: await fn(), requestId: null }),
        client: {
          reddit: {
            search: async (input: Record<string, unknown>) => {
              asked.push(input);
              return { output: { found: false as const }, costUsd: 0 };
            },
          },
        },
      },
    };
    await fetchSearch(
      ctx as unknown as Parameters<typeof fetchSearch>[0],
      "hotels that take under 21s",
      options,
    );
    return { key: calls[calls.length - 1], asked: asked[0] };
  }

  it("keys relevance and new apart, over a year, and asks upstream for each", async () => {
    const relevance = await search({ timeframe: "year" });
    const fresh = await search({ timeframe: "year", sort: "new" });

    expect(relevance.key.sort).toBe("relevance");
    expect(fresh.key.sort).toBe("new");
    expect(relevance.key.sort).not.toBe(fresh.key.sort);
    expect(relevance.key.timeframe).toBe("year");
    expect(relevance.asked?.sort).toBe("relevance");
    expect(fresh.asked?.sort).toBe("new");
    expect(fresh.asked?.timeframe).toBe("year");
  });
});
