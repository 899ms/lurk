import { describe, expect, it, vi } from "vitest";
import type { ScorableItem } from "@/lib/scan/judgement";

/**
 * The shared reading decides which posts the judgement call sees. What matters
 * is which way it errs: only a reading that says the author is not a buyer
 * asking for something may keep a post from the judge, and an absent reading
 * costs a judgement rather than a lead.
 */

const generateStructured = vi.fn();

vi.mock("@/lib/llm", () => ({ generateStructured }));
vi.mock("@/db", () => ({
  db: () => ({
    select: () => ({ from: () => ({ where: async () => [] }) }),
    insert: () => ({ values: () => ({ onConflictDoUpdate: async () => undefined }) }),
  }),
}));

const { readPosts, splitByReading } = await import("@/lib/scan/reading");

function post(id: string): ScorableItem {
  return {
    id,
    title: "Anyone found a form tool that takes payments?",
    subreddit: "SaaS",
    body: "Ours cannot and we are stuck.",
    author: "asker",
    ageHours: 3,
    upvotes: 5,
    numComments: 1,
    parentBody: null,
  };
}

function read(speaker: string, asking: boolean) {
  return {
    speaker: speaker as "buyer",
    asking,
    need: asking ? "a form builder that takes payments" : "",
    category: asking ? "form builder" : "",
    constraints: [],
  };
}

describe("what the shared reading keeps from the judge", () => {
  it("sends a buyer who is asking to the judge and cuts nothing", () => {
    const items = [post("p1")];
    const split = splitByReading(items, new Map([["p1", read("buyer", true)]]));
    expect(split.toJudge.map((item) => item.id)).toEqual(["p1"]);
    expect(split.cut).toEqual([]);
  });

  /**
   * A reading that is not a buyer asking for something never reaches the judge.
   * What it becomes is the gates' business: a settled disqualifier rejects, and
   * a speaker the reading could not place while it still claims they are asking
   * is held for review, which is the rejection invariant in gates.ts.
   */
  it.each([
    ["seller", true, "seller_only", "reject"],
    ["helper", true, "helper_only", "reject"],
    ["buyer", false, "no_active_need", "reject"],
    ["unknown", true, "insufficient_evidence", "reject"],
    ["discussion", true, "no_active_need", "review"],
  ])("keeps a %s from the judge", (speaker, asking, code, decision) => {
    const split = splitByReading([post("p1")], new Map([["p1", read(speaker, asking)]]));
    expect(split.toJudge).toEqual([]);
    expect(split.cut).toHaveLength(1);
    expect(split.cut[0].id).toBe("p1");
    expect(split.cut[0].decision).toBe(decision);
    expect(split.cut[0].reasonCode).toBe(code);
  });

  it("judges a post the reading could not answer for", () => {
    const split = splitByReading([post("p1")], new Map());
    expect(split.toJudge.map((item) => item.id)).toEqual(["p1"]);
    expect(split.cut).toEqual([]);
  });

  it("returns no reading when the model call fails, so the post is judged", async () => {
    generateStructured.mockRejectedValueOnce(new Error("upstream is down"));
    const readings = await readPosts("project", [post("p1")]);
    expect(readings.size).toBe(0);
    expect(splitByReading([post("p1")], readings).toJudge).toHaveLength(1);
  });

  it("never reads a post Reddit has taken away", async () => {
    generateStructured.mockClear();
    const removed = { ...post("p1"), body: "[deleted]" };
    expect((await readPosts("project", [removed])).size).toBe(0);
    expect(generateStructured).not.toHaveBeenCalled();
  });
});
