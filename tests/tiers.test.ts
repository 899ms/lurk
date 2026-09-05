import { describe, expect, it } from "vitest";
import { TIERS, limitsFor } from "@/lib/tiers";

describe("tiers", () => {
  it("keeps the free tier's published numbers", () => {
    expect(TIERS.free.projects).toBe(2);
    expect(TIERS.free.keywordsPerProject).toBe(25);
    expect(TIERS.free.subredditsPerProject).toBe(10);
    expect(TIERS.free.scanIntervalHours).toBe(6);
    expect(TIERS.free.commentThreadsPerScan).toBe(20);
    expect(TIERS.free.seoKeywords).toBe(10);
    expect(TIERS.free.competitors).toBe(3);
    expect(TIERS.free.apiRequestsPerDay).toBe(1000);
  });

  it("makes a connected wallet buy freshness and breadth, not features", () => {
    expect(TIERS.connected.scanIntervalHours).toBe(1);
    expect(TIERS.connected.projects).toBeNull();
    expect(TIERS.connected.seoSearchVolume).toBe(true);
    expect(TIERS.connected.feedWindowDays).toBe(TIERS.free.feedWindowDays);
  });

  it("removes every limit when self-hosted", () => {
    expect(limitsFor("free", true)).toBeNull();
    expect(limitsFor("free", false)).toBe(TIERS.free);
  });
});
