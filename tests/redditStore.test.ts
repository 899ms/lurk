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

/**
 * The rows are written in id order so two concurrent walks cannot deadlock on
 * the same post, and a deadlock is exactly what killed a sweep on 2026-09-10.
 * The ranking a run stores is the order upstream returned, so the caller must
 * still get that order back.
 */
describe.skipIf(!process.env.DATABASE_URL)("the order posts are stored in", () => {
  it("returns them as upstream ranked them, whatever order they are written in", async () => {
    process.env.APP_ENCRYPTION_KEY ??= Buffer.alloc(32).toString("base64");
    const { upsertPosts } = await import("@/lib/reddit/store");
    const suffix = randomUUID().slice(0, 8);
    // Ranked z, a, m: the reverse of the order the statement lists them in.
    const ranked = ["z", "a", "m"].map((letter, index) => ({
      id: `t3_${letter}${suffix}`,
      subreddit: "discgolf",
      author: "asker",
      title: `Ranked ${index}`,
      selftext: "",
      permalink: `/r/discgolf/comments/${letter}${suffix}/ranked/`,
      createdUtc: Math.floor(Date.now() / 1000),
    }));

    const stored = await upsertPosts(ranked);

    expect(stored.map((post) => post.id)).toEqual([`z${suffix}`, `a${suffix}`, `m${suffix}`]);
  });
});
