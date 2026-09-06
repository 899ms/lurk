import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
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

describe("phrasing cap", () => {
  const phrasings = Array.from({ length: 12 }, (_, index) => `way of asking ${index}`);

  it("cuts a free project to the tier's allowance and refreshes weekly", () => {
    const settings = seoSettings(TIERS.free, phrasings);
    expect(settings.phrasings).toHaveLength(10);
    expect(settings.phrasings[0]).toBe("way of asking 0");
    expect(settings.refreshDays).toBe(7);
    expect(settings.searchVolume).toBe(false);
  });

  it("caps nothing for a connected wallet and buys volume", () => {
    const settings = seoSettings(TIERS.connected, phrasings);
    expect(settings.phrasings).toHaveLength(12);
    expect(settings.searchVolume).toBe(true);
  });

  it("treats a self-hosted instance like a connected wallet", () => {
    expect(seoSettings(null, phrasings).phrasings).toHaveLength(12);
    expect(seoSettings(null, phrasings).searchVolume).toBe(true);
  });
});

/**
 * The refresh searches the way buyers say the problem. It used to search the
 * plan's Reddit queries, which are Boolean expressions Google reads as
 * literal text, so this is the seam that has to stay pointed at the phrasings.
 */
describe.skipIf(!process.env.DATABASE_URL)("what a refresh searches", () => {
  it("takes the project's phrasings, never its Reddit Boolean queries", async () => {
    const { db } = await import("@/db");
    const schema = await import("@/db/schema");
    const { loadScanProject } = await import("@/lib/scan/project");
    const [user] = await db()
      .insert(schema.users)
      .values({ clerkUserId: `test_${randomUUID()}` })
      .returning();
    const [project] = await db()
      .insert(schema.projects)
      .values({
        userId: user.id,
        name: "HotelsAllow",
        problemPhrasings: ["hotels that let 19 year olds check in"],
      })
      .returning();
    await db()
      .insert(schema.projectKeywords)
      .values({ projectId: project.id, keyword: "(hotel OR hotels) AND (18 OR 19)" });

    const loaded = await loadScanProject(project.id);
    const settings = seoSettings(TIERS.free, loaded?.phrasings ?? []);
    expect(settings.phrasings).toEqual(["hotels that let 19 year olds check in"]);
    expect(settings.phrasings).not.toContain("(hotel OR hotels) AND (18 OR 19)");
    await db().delete(schema.users).where(eq(schema.users.id, user.id));
  });
});
