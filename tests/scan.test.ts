import { describe, expect, it } from "vitest";
import { withoutKnownLeads, leadKey } from "@/lib/scan/leads";
import { MAX_POST_READS_FREE, foldScore, postReadCap } from "@/lib/scan/constants";
import { retentionCutoff } from "@/lib/retention";
import { TIERS } from "@/lib/tiers";

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
