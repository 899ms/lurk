import { describe, expect, it } from "vitest";
import { competitorNamed } from "@/lib/seo/competitors";
import { seoSettings } from "@/lib/seo/limits";
import { redditResults, redditThread } from "@/lib/seo/links";
import { TIERS } from "@/lib/tiers";

describe("Reddit thread links", () => {
  it("reads the community and the post out of a thread URL on any reddit host", () => {
    expect(redditThread("https://www.reddit.com/r/SaaS/comments/abc123/some_title/")).toEqual({
      subreddit: "SaaS",
      postId: "abc123",
      canonicalUrl: "https://www.reddit.com/r/SaaS/comments/abc123/",
    });
    expect(redditThread("https://old.reddit.com/r/SaaS/comments/abc123/")?.postId).toBe("abc123");
    expect(redditThread("https://reddit.com/r/SaaS/comments/abc123/")?.subreddit).toBe("SaaS");
  });

  it("rejects mirrors, non-thread pages and anything unparseable", () => {
    expect(redditThread("https://notreddit.com/r/SaaS/comments/abc123/")).toBeNull();
    expect(redditThread("https://reddit.com.example.net/r/SaaS/comments/abc123/")).toBeNull();
    expect(redditThread("https://www.reddit.com/r/SaaS/")).toBeNull();
    expect(redditThread("https://www.reddit.com/user/someone/")).toBeNull();
    expect(redditThread("https://www.reddit.com/r/SaaS/comments/")).toBeNull();
    expect(redditThread("/r/SaaS/comments/abc123/")).toBeNull();
  });

  it("keeps Google's own order and positions", () => {
    const kept = redditResults([
      { link: "https://example.com/a", position: 1 },
      { link: "https://www.reddit.com/r/SaaS/comments/a/", position: 2 },
      { link: "https://old.reddit.com/r/nocode/comments/b/", position: 3 },
      { link: "https://www.reddit.com/r/SaaS/", position: 4 },
    ]);
    expect(kept.map((result) => result.position)).toEqual([2, 3]);
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
