import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

/**
 * Reddit search hands the post's own text back under `selftext`, and a stored
 * post that keeps it is a post nobody has to buy again through `reddit.post`.
 * Proven against a real database, because the write is the claim.
 */
describe.skipIf(!process.env.DATABASE_URL)("storing a search result", () => {
  it("keeps the text a search carried, and dates the observation", async () => {
    process.env.APP_ENCRYPTION_KEY ??= Buffer.alloc(32).toString("base64");
    const { upsertPosts } = await import("@/lib/reddit/store");

    const [stored] = await upsertPosts([
      {
        id: `t3_${randomUUID().slice(0, 8)}`,
        subreddit: "discgolf",
        author: "asker",
        title: "Anywhere near the course that takes under 21s",
        selftext: "Four of us are 19 and every hotel we called says 21+.",
        permalink: "/r/discgolf/comments/abc123/anywhere_near_the_course/",
        score: 8,
        numComments: 5,
        createdUtc: Math.floor(Date.now() / 1000),
      },
    ]);

    expect(stored.body).toBe("Four of us are 19 and every hotel we called says 21+.");
    expect(stored.bodyObservedAt).toBeInstanceOf(Date);
  });

  it("leaves a body-less listing unobserved", async () => {
    process.env.APP_ENCRYPTION_KEY ??= Buffer.alloc(32).toString("base64");
    const { upsertPosts } = await import("@/lib/reddit/store");

    const [stored] = await upsertPosts([
      {
        id: `t3_${randomUUID().slice(0, 8)}`,
        subreddit: "discgolf",
        author: "asker",
        title: "A link post has no text of its own",
        selftext: "",
        permalink: "/r/discgolf/comments/def456/a_link_post/",
        createdUtc: Math.floor(Date.now() / 1000),
      },
    ]);

    expect(stored.body).toBeNull();
    expect(stored.bodyObservedAt).toBeNull();
  });
});
