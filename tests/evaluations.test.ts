import { describe, expect, it, vi } from "vitest";
import { leadKey } from "@/lib/scan/leads";
import {
  alreadyJudged,
  contentHash,
  digestComments,
  postHash,
} from "@/lib/scan/evaluations";

/**
 * What a stored verdict is worth on the next scan, and what a thread is read
 * for. The scan module pulls in the language model client, so it is imported
 * after the mock the way the rest of the suite does it.
 */

vi.mock("@/lib/llm", () => ({ generateStructured: vi.fn() }));

const { representativeComments, verificationText } = await import("@/lib/scan/comments");

describe("reusing a stored verdict", () => {
  const stored = new Map([[leadKey("abc", null), { profileVersion: 3, contentHash: "hash" }]]);

  it("skips a candidate whose text and product profile are both unchanged", () => {
    expect(alreadyJudged(stored, leadKey("abc", null), 3, "hash")).toBe(true);
  });

  it("judges it again after a profile edit", () => {
    expect(alreadyJudged(stored, leadKey("abc", null), 4, "hash")).toBe(false);
  });

  it("judges it again once its text has changed", () => {
    expect(alreadyJudged(stored, leadKey("abc", null), 3, "other")).toBe(false);
  });

  it("has never seen a candidate it holds no verdict for", () => {
    expect(alreadyJudged(stored, leadKey("def", null), 3, "hash")).toBe(false);
  });

  it("hashes only the text a verdict was made on", () => {
    expect(postHash("t", "b", digestComments([]))).toBe(postHash("t", "b", digestComments([])));
    expect(postHash("t", "b", digestComments([]))).not.toBe(
      postHash("t", "b", digestComments([{ id: "c1", body: "new reply" }])),
    );
  });

  it("reads a thread the same whatever order its comments arrive in", () => {
    const one = [
      { id: "c1", body: "first" },
      { id: "c2", body: "second" },
    ];
    expect(digestComments(one)).toBe(digestComments([...one].reverse()));
  });

  it("separates a comment's verdict from its parent post's", () => {
    expect(contentHash(["title", "parent", "comment"])).not.toBe(
      contentHash(["title", null, "parent comment"]),
    );
  });
});

describe("what a thread is read for", () => {
  const post = {
    id: "p1",
    author: "asker",
    title: "Need a form tool",
    body: "Our signup form needs conditional logic.",
    subreddit: "SaaS",
    numComments: 3,
    score: 4,
    createdAt: new Date(),
  } as never as import("@/lib/reddit/store").StoredPost;

  function comment(patch: Record<string, unknown>) {
    return {
      id: "c1",
      postId: "p1",
      author: "someone",
      body: "text",
      score: 1,
      permalink: null,
      parentId: null,
      raw: null,
      createdAt: new Date(),
      fetchedAt: new Date(),
      ...patch,
    } as never as import("@/lib/reddit/store").StoredComment;
  }

  it("gives the post its author's follow-ups and the answers others gave", () => {
    const text = verificationText({
      post,
      comments: [
        comment({ id: "c1", author: "asker", body: "We went with Formcraft, thanks." }),
        comment({ id: "c2", author: "helper", body: "Try Formcraft." }),
      ],
    });
    expect(text).toContain("We went with Formcraft, thanks.");
    expect(text).toContain("u/helper: Try Formcraft.");
    expect(text).toContain("Our signup form needs conditional logic.");
  });

  it("verifies a thread with one reply, because one reply can end it", () => {
    const text = verificationText({
      post,
      comments: [comment({ author: "asker", body: "Solved." })],
    });
    expect(text).toContain("Solved.");
  });

  it("turns one author's four comments into one opportunity", () => {
    const kept = representativeComments({
      post,
      comments: [
        comment({ id: "c1", author: "buyer", body: "short" }),
        comment({ id: "c2", author: "buyer", body: "the longer one with the actual need" }),
        comment({ id: "c3", author: "asker", body: "the post author replying" }),
      ],
    });
    expect(kept.map((one) => one.id)).toEqual(["c2"]);
  });
});
