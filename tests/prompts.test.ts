import { describe, expect, it } from "vitest";
import { JUDGEMENT_SYSTEM, PROFILE_SYSTEM } from "@/lib/prompts";

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

/**
 * The profile only ever described who the buyer is, so a person who shares the
 * product's vocabulary and will never buy had no way into the facts the judge
 * reads. The page is still the only source, so the field is allowed to be empty.
 */
describe("profile not-buyers", () => {
  it("asks who is not a buyer, only where the page supports it", () => {
    const bullet = PROFILE_SYSTEM.split("\n").find((line) => line.startsWith("- notBuyers:"));
    expect(bullet).toBeDefined();
    expect(bullet).toMatch(/not its buyer/);
    expect(bullet).toMatch(/Empty list when the page gives no ground/);
  });
});

describe("judgement calibration", () => {
  /**
   * The only false positive in the 2026-09-10 HotelsAllow sweep was a post
   * whose age words described a concert companion, not a check-in policy. The
   * judge needs a rule that a shared word is not a shared need, and one worked
   * example of it.
   */
  it("says a word the product's vocabulary uses is not by itself a need", () => {
    expect(JUDGEMENT_SYSTEM).toMatch(/not by itself a need/);
    expect(JUDGEMENT_SYSTEM).toMatch(/name the job they actually\ndescribe/);
    expect(JUDGEMENT_SYSTEM).toMatch(/describe a travel companion, not a check-in policy/);
  });
});
