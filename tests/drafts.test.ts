import { describe, expect, it, vi } from "vitest";
import { draftDefect, MAX_DRAFT_WORDS, wordCount } from "@/lib/drafts/check";
import { composeDraft, PitchNotAllowedError } from "@/lib/drafts/compose";
import { pitchAllowed, pitchRefusal } from "@/lib/drafts/policy";
import { draftPrompt, draftSystem, type DraftContext } from "@/lib/drafts/prompt";

const context: DraftContext = {
  product: {
    name: "Fieldkit",
    url: "https://fieldkit.example",
    pain: "Building a form takes an afternoon of fighting a page builder.",
    solution: "Turns a plain description into a working form with logic and payments.",
    targetUsers: "Solo founders and small agencies who bill clients for intake forms.",
    voiceProfile: "short sentences, lower case, no exclamation marks",
  },
  lead: {
    title: "Typeform pricing went up again, what are people using instead?",
    body: "We collect about 400 responses a month and the jump to the next tier is brutal.",
    subreddit: "smallbusiness",
    promoPolicy: "Allowed when relevant and helpful",
    author: "hedgerow_dev",
    matchedPhrase: "the jump to the next tier is brutal",
    reason: "They are paying for a form builder and actively looking at replacements.",
    stage: "comparing",
    isComment: false,
  },
};

const banned: DraftContext = {
  ...context,
  lead: { ...context.lead, subreddit: "nostupidquestions", promoPolicy: "Self-promotion banned" },
};

describe("promotion policy", () => {
  it("allows a pitch when the rule leaves room for one", () => {
    expect(pitchAllowed("Allowed when relevant and helpful")).toBe(true);
    expect(pitchAllowed("No rule stated")).toBe(true);
    expect(pitchAllowed(null)).toBe(true);
  });

  it("refuses a pitch when the rule forbids self-promotion", () => {
    expect(pitchAllowed("Self-promotion banned")).toBe(false);
    expect(pitchAllowed("Links to your own product are not allowed")).toBe(false);
    expect(pitchAllowed("No self promotion of any kind")).toBe(false);
  });

  it("explains the refusal in one sentence naming the subreddit", () => {
    const sentence = pitchRefusal("nostupidquestions", "Self-promotion banned");
    expect(sentence).toContain("r/nostupidquestions");
    expect(sentence).toContain("Self-promotion banned");
    expect(sentence.split(". ").length).toBe(1);
  });
});

describe("prompt assembly", () => {
  it("grounds the reply in the product and the post", () => {
    const prompt = draftPrompt(context, "starter");
    for (const fact of [
      "Fieldkit",
      "https://fieldkit.example",
      "Solo founders",
      "r/smallbusiness",
      "Allowed when relevant and helpful",
      "u/hedgerow_dev",
      "Typeform pricing went up again",
      "the jump to the next tier is brutal",
      "comparing",
    ]) {
      expect(prompt).toContain(fact);
    }
  });

  it("says the product is context only in starter mode, and mentionable in pitch mode", () => {
    expect(draftPrompt(context, "starter")).toContain("must not appear in the reply");
    expect(draftPrompt(context, "pitch")).toContain("mentioned exactly once");
  });

  it("labels a comment lead as their comment", () => {
    const comment = { ...context, lead: { ...context.lead, isComment: true } };
    expect(draftPrompt(comment, "starter")).toContain("their comment:");
    expect(draftPrompt(context, "starter")).toContain("their post:");
  });

  it("carries the saved voice into the instructions", () => {
    expect(draftSystem(context, "comment", "starter")).toContain("short sentences, lower case");
  });

  it("falls back to plain writing when no voice is saved", () => {
    const voiceless = { ...context, product: { ...context.product, voiceProfile: null } };
    expect(draftSystem(voiceless, "comment", "starter")).toContain("one person types to another");
  });
});

describe("mode rules", () => {
  it("keeps the starter free of products, links and I built", () => {
    const system = draftSystem(context, "comment", "starter");
    expect(system).toContain("2 to 4 sentences");
    expect(system).toContain("one open question");
    expect(system).toContain("Name no product at all");
    expect(system).toContain("Include no link");
    expect(system).toContain('"I built"');
  });

  it("makes the pitch honest, single-mention and useful on its own", () => {
    const system = draftSystem(context, "comment", "pitch");
    expect(system).toContain("worth reading if every product name were deleted");
    expect(system).toContain("at least one honest alternative");
    expect(system).toContain("exactly once");
    expect(system).toContain("No superlatives");
  });

  it("holds both modes under the word ceiling and off emoji", () => {
    for (const mode of ["starter", "pitch"] as const) {
      const system = draftSystem(context, "comment", mode);
      expect(system).toContain(`under ${MAX_DRAFT_WORDS} words`);
      expect(system).toContain("No emoji");
      expect(system).toContain("hope this helps");
    }
  });

  it("opens a direct message on the thread title and never asks for time", () => {
    const system = draftSystem(context, "dm", "starter");
    expect(system).toContain("names the thread by its title");
    expect(system).toContain("Never ask for their email, a call, a demo or their time");
  });

  it("tells a comment which subreddit it is going into", () => {
    expect(draftSystem(context, "comment", "starter")).toContain("public comment in r/smallbusiness");
  });
});

describe("draft checks", () => {
  it("counts words the way the ceiling is written", () => {
    expect(wordCount("  two  words ")).toBe(2);
  });

  it("rejects a link in starter mode only", () => {
    const text = "that pricing jump stings. have you tried fieldkit.io yet?";
    expect(draftDefect(text, "comment", "starter", context.lead.title)).toBe("link");
    expect(draftDefect(text, "comment", "pitch", context.lead.title)).toBeNull();
  });

  it("rejects a reply past the word ceiling", () => {
    const long = Array.from({ length: MAX_DRAFT_WORDS + 1 }, () => "word").join(" ");
    expect(draftDefect(long, "comment", "starter", context.lead.title)).toBe("too_long");
  });

  it("rejects a comment that repeats the post title", () => {
    const echo = `re: ${context.lead.title} what are you collecting?`;
    expect(draftDefect(echo, "comment", "starter", context.lead.title)).toBe("echoes_title");
  });

  it("lets a direct message name the thread by its title", () => {
    const dm = `saw your thread "${context.lead.title}" and wanted to ask what you collect.`;
    expect(draftDefect(dm, "dm", "starter", context.lead.title)).toBeNull();
  });

  it("passes a reply that follows the rules", () => {
    const good = "400 a month on a form builder is a rough place to be. what does your intake actually need to do?";
    expect(draftDefect(good, "comment", "starter", context.lead.title)).toBeNull();
  });
});

describe("composing a draft", () => {
  it("returns the first reply when it follows the rules", async () => {
    const write = vi.fn().mockResolvedValue("  that tier jump is rough. what does your intake need?  ");
    const text = await composeDraft(context, "comment", "starter", write);
    expect(text).toBe("that tier jump is rough. what does your intake need?");
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("asks once more when the first reply breaks a rule, saying which", async () => {
    const write = vi
      .fn()
      .mockResolvedValueOnce("try fieldkit.io, it is cheaper")
      .mockResolvedValueOnce("that tier jump is rough. what does your intake need?");
    const text = await composeDraft(context, "comment", "starter", write);
    expect(write).toHaveBeenCalledTimes(2);
    expect(write.mock.calls[1][1]).toContain("included a link");
    expect(text).toBe("that tier jump is rough. what does your intake need?");
  });

  it("never asks a third time", async () => {
    const write = vi.fn().mockResolvedValue("try fieldkit.io, it is cheaper");
    await composeDraft(context, "comment", "starter", write);
    expect(write).toHaveBeenCalledTimes(2);
  });

  it("refuses a pitch where self-promotion is banned, without calling the model", async () => {
    const write = vi.fn();
    await expect(composeDraft(banned, "comment", "pitch", write)).rejects.toBeInstanceOf(
      PitchNotAllowedError,
    );
    expect(write).not.toHaveBeenCalled();
  });

  it("still writes a starter where self-promotion is banned", async () => {
    const write = vi.fn().mockResolvedValue("that tier jump is rough. what does your intake need?");
    await expect(composeDraft(banned, "comment", "starter", write)).resolves.toBeTruthy();
  });
});
