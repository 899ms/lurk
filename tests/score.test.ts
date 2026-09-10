import { describe, expect, it, vi } from "vitest";

const generateStructured = vi.fn();
vi.mock("@/lib/llm", () => ({ generateStructured }));

const { triageTitles } = await import("@/lib/scan/score");
const { TRIAGE_BATCH_SIZE } = await import("@/lib/scan/constants");

function candidates(n: number) {
  return Array.from({ length: n }, (_, index) => ({
    id: `p${index}`,
    title: `title ${index}`,
    subreddit: "hotels",
    author: "someone",
    score: 1,
    ageHours: 10,
  }));
}

describe("triage over many batches", () => {
  /**
   * One dropped OpenRouter connection on batch 48 of 51 threw away a whole
   * sweep's triage on 2026-09-10. A batch the model never answered has to mean
   * the same as a batch it answered with nothing: unread, never rejected.
   */
  it("keeps the other batches when one batch's model call fails", async () => {
    const all = candidates(TRIAGE_BATCH_SIZE * 3);
    let calls = 0;
    generateStructured.mockImplementation(async (input: { prompt: string }) => {
      calls += 1;
      if (calls === 2) {
        throw new Error("terminated");
      }
      const ids = [...input.prompt.matchAll(/id: (p\d+)/g)].map((match) => match[1]);
      return {
        items: ids.map((id) => ({
          id,
          disposition: "read",
          priority: "high",
          reasonCode: "explicit_ask",
          reason: "asks for a room",
        })),
      };
    });

    const out = await triageTitles("project", "product", all);

    expect(out).toHaveLength(all.length);
    expect(out.filter((item) => item.disposition === "read")).toHaveLength(TRIAGE_BATCH_SIZE * 2);
    const unread = out.filter((item) => item.disposition === "uncertain");
    expect(unread).toHaveLength(TRIAGE_BATCH_SIZE);
    expect(unread.every((item) => item.reasonCode === "insufficient_context")).toBe(true);
  });

  it("asks the batches at once, not one after another", async () => {
    let live = 0;
    let peak = 0;
    generateStructured.mockImplementation(async (input: { prompt: string }) => {
      live += 1;
      peak = Math.max(peak, live);
      await new Promise((resolve) => setTimeout(resolve, 5));
      live -= 1;
      const ids = [...input.prompt.matchAll(/id: (p\d+)/g)].map((match) => match[1]);
      return { items: ids.map((id) => ({ id, disposition: "reject", priority: "low", reasonCode: "off_topic", reason: "no" })) };
    });

    await triageTitles("project", "product", candidates(TRIAGE_BATCH_SIZE * 4));

    expect(peak).toBeGreaterThan(1);
  });
});
