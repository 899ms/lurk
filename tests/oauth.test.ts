import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createPkcePair } from "@/lib/oauth";

describe("pkce", () => {
  it("derives the challenge as base64url S256 of the verifier", () => {
    const { verifier, challenge } = createPkcePair();
    expect(challenge).toBe(createHash("sha256").update(verifier).digest("base64url"));
    expect(challenge).not.toContain("=");
  });

  it("mints a different verifier every time", () => {
    expect(createPkcePair().verifier).not.toBe(createPkcePair().verifier);
  });
});
