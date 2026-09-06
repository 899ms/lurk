import { describe, expect, it } from "vitest";
import { competitorNamed } from "@/lib/seo/competitors";
import { seoSettings } from "@/lib/seo/limits";
import { isRedditLink, redditResults, subredditFromUrl } from "@/lib/seo/links";
import { TIERS } from "@/lib/tiers";

describe("Reddit link filter", () => {
  it("keeps reddit.com and its subdomains", () => {
    expect(isRedditLink("https://www.reddit.com/r/SaaS/comments/abc/title/")).toBe(true);
    expect(isRedditLink("https://old.reddit.com/r/SaaS/comments/abc/")).toBe(true);
    expect(isRedditLink("https://reddit.com/r/SaaS/comments/abc/")).toBe(true);
  });

  it("drops look-alike hosts and anything unparseable", () => {
    expect(isRedditLink("https://notreddit.com/r/SaaS/")).toBe(false);
    expect(isRedditLink("https://reddit.com.example.net/r/SaaS/")).toBe(false);
    expect(isRedditLink("/r/SaaS/comments/abc/")).toBe(false);
  });

  it("keeps Google's own order and positions", () => {
    const kept = redditResults([
      { link: "https://example.com/a", position: 1 },
      { link: "https://www.reddit.com/r/SaaS/comments/a/", position: 2 },
      { link: "https://old.reddit.com/r/nocode/comments/b/", position: 3 },
    ]);
    expect(kept.map((result) => result.position)).toEqual([2, 3]);
  });

  it("reads the community out of a thread URL", () => {
    expect(subredditFromUrl("https://www.reddit.com/r/SaaS/comments/abc/title/")).toBe("SaaS");
    expect(subredditFromUrl("https://www.reddit.com/user/someone/")).toBe("");
  });
});

describe("competitor match", () => {
  it("finds a name in the title or the body whatever its case", () => {
    expect(competitorNamed(["Typeform"], "Is TYPEFORM worth it?", null)).toBe(true);
    expect(competitorNamed(["Typeform"], "Best form tool", "we moved off typeform")).toBe(true);
  });

  it("says no when no competitor is named", () => {
    expect(competitorNamed(["Typeform", "Tally"], "Best form tool", "google forms is fine")).toBe(
      false,
    );
  });

  it("ignores an empty competitor rather than matching everything", () => {
    expect(competitorNamed(["  "], "Best form tool", "anything")).toBe(false);
    expect(competitorNamed([], "Best form tool", "anything")).toBe(false);
  });
});

describe("keyword cap", () => {
  const keywords = Array.from({ length: 12 }, (_, index) => `keyword ${index}`);

  it("cuts a free project to the tier's keywords and refreshes weekly", () => {
    const settings = seoSettings(TIERS.free, keywords);
    expect(settings.keywords).toHaveLength(10);
    expect(settings.keywords[0]).toBe("keyword 0");
    expect(settings.refreshDays).toBe(7);
    expect(settings.searchVolume).toBe(false);
  });

  it("caps nothing for a connected wallet and buys volume", () => {
    const settings = seoSettings(TIERS.connected, keywords);
    expect(settings.keywords).toHaveLength(12);
    expect(settings.searchVolume).toBe(true);
  });

  it("treats a self-hosted instance like a connected wallet", () => {
    expect(seoSettings(null, keywords).keywords).toHaveLength(12);
    expect(seoSettings(null, keywords).searchVolume).toBe(true);
  });
});
