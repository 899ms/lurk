import { describe, expect, it, vi } from "vitest";
import { withoutKnownLeads, leadKey } from "@/lib/scan/leads";
import { SCORER_SYSTEM } from "@/lib/prompts";
import { MAX_POST_READS_FREE, foldScore, postReadCap } from "@/lib/scan/constants";
import { retentionCutoff } from "@/lib/retention";
import { TIERS } from "@/lib/tiers";

const generateStructured = vi.fn();

vi.mock("@/lib/llm", () => ({ generateStructured }));

const { scoreItems } = await import("@/lib/scan/score");

describe("score folding", () => {
  it("weights intent double", () => {
    expect(foldScore(10, 10, 10)).toBe(100);
    expect(foldScore(2, 8, 5)).toBeGreaterThan(foldScore(8, 2, 5));
  });

  it("stays inside 0-100 at both ends", () => {
    expect(foldScore(1, 1, 1)).toBe(10);
    expect(foldScore(5, 5, 5)).toBe(50);
  });
});

describe("post read cap", () => {
  it("reads three posts per comment thread the tier allows", () => {
    expect(postReadCap({ ...TIERS.free, commentThreadsPerScan: 10 }, "free")).toBe(30);
  });

  it("never reads more than the free ceiling", () => {
    expect(postReadCap(TIERS.free, "free")).toBe(MAX_POST_READS_FREE);
    expect(postReadCap({ ...TIERS.free, commentThreadsPerScan: 100 }, "free")).toBe(
      MAX_POST_READS_FREE,
    );
  });

  it("caps nothing for a connected wallet or a self-hosted instance", () => {
    expect(postReadCap(TIERS.connected, "connected")).toBeNull();
    expect(postReadCap(null, "free")).toBeNull();
  });
});

describe("lead dedupe", () => {
  it("drops a post the project already judged", () => {
    const known = new Set([leadKey("abc", null)]);
    const kept = withoutKnownLeads(known, [{ postId: "abc" }, { postId: "def" }]);
    expect(kept.map((item) => item.postId)).toEqual(["def"]);
  });

  it("keeps a comment on a post that is already a lead", () => {
    const known = new Set([leadKey("abc", null)]);
    const kept = withoutKnownLeads(known, [{ postId: "abc", commentId: "c1" }]);
    expect(kept).toHaveLength(1);
  });

  it("drops a duplicate inside one batch", () => {
    const kept = withoutKnownLeads(new Set(), [{ postId: "abc" }, { postId: "abc" }]);
    expect(kept).toHaveLength(1);
  });
});

describe("retention cutoff", () => {
  it("keeps exactly the feed window", () => {
    const now = new Date("2026-09-05T00:00:00Z");
    expect(retentionCutoff(now).toISOString()).toBe("2026-08-06T00:00:00.000Z");
  });

  it("matches the tier feed window", () => {
    const now = new Date("2026-09-05T00:00:00Z");
    const days = (now.getTime() - retentionCutoff(now).getTime()) / (24 * 60 * 60 * 1000);
    expect(days).toBe(TIERS.free.feedWindowDays);
  });
});

/**
 * A real scan scored this comment 63 and offered it as a lead. The commenter is
 * recommending a product, not looking for one, so it belongs on the seller side.
 */
describe("scoring a recommendation", () => {
  it("carries the seller-side verdict through to the lead", async () => {
    generateStructured.mockResolvedValue({
      items: [
        {
          id: "c_tally",
          fit: 7,
          intent: 6,
          engagement: 6,
          stage: "comparing",
          reason: "Recommends a form builder to someone else, and wants nothing themselves.",
          matchedPhrase: "Tally will cover all three of those easily",
          sellerSide: true,
        },
      ],
    });
    const judged = await scoreItems("project-1", "A form builder", [
      {
        id: "c_tally",
        title: "Looking for a form tool with logic, payments and webhooks",
        subreddit: "SaaS",
        body: "Tally will cover all three of those easily, and the free plan is generous.",
      },
    ]);
    expect(judged).toHaveLength(1);
    expect(judged[0].sellerSide).toBe(true);
    expect(judged[0].score).toBe(foldScore(7, 6, 6));
    expect(generateStructured.mock.calls[0][0].system).toBe(SCORER_SYSTEM);
  });

  it("tells the model that recommending a product is seller side", () => {
    expect(SCORER_SYSTEM).toContain("recommending or defending a product they are not themselves");
  });
});
