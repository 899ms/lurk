import { describe, expect, it } from "vitest";
import { PROFILE_SYSTEM } from "@/lib/prompts";

describe("profile phrasings", () => {
  it("asks for phrasings spread across the situations the page implies", () => {
    const bullet = PROFILE_SYSTEM.split("\n").find((line) => line.startsWith("- problemPhrasings:"));
    expect(bullet).toBeDefined();
    expect(bullet).toMatch(/distinct situations/);
    expect(bullet).toMatch(/who is acting for whom/);
    expect(bullet).toMatch(/booking already made/);
    expect(bullet).toMatch(/"parent booking a hotel for an 18 year old"/);
  });
});
