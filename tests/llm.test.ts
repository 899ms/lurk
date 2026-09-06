import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

/**
 * A model that means an apostrophe sometimes writes the JSON escape for NUL,
 * and the character that lands in the answer is the one Postgres refuses in a
 * jsonb column. The boundary that hands the answer on is where it has to go.
 */

const generateObject = vi.fn();

vi.mock("ai", () => ({ generateObject }));
vi.mock("@openrouter/ai-sdk-provider", () => ({
  createOpenRouter: () => ({ chat: (model: string) => model }),
}));
vi.mock("@/lib/config", () => ({
  config: () => ({
    OPENROUTER_API_KEY: "test-key",
    OPENROUTER_MODEL: "test-model",
    HOUSE_LLM_CAP_USD_PER_DAY: 10,
  }),
}));
vi.mock("@/db", () => ({
  db: () => ({
    select: () => ({ from: () => ({ where: async () => [{ total: "0" }] }) }),
    insert: () => ({ values: async () => undefined }),
  }),
}));

const { generateStructured } = await import("@/lib/llm");

const schema = z.object({
  verdict: z.object({ quote: z.string() }),
  reasons: z.array(z.string()),
});

describe("what the language model boundary hands on", () => {
  it("drops a NUL from every string, however deep it sits in the answer", async () => {
    generateObject.mockResolvedValue({
      object: {
        verdict: { quote: "it\u0000s free" },
        reasons: ["they\u0000 said they need one"],
      },
      usage: { inputTokens: 10, outputTokens: 5 },
    });

    const answer = await generateStructured({
      purpose: "test",
      projectId: null,
      schema,
      system: "s",
      prompt: "p",
    });

    expect(answer).toEqual({
      verdict: { quote: "its free" },
      reasons: ["they said they need one"],
    });
  });
});
