import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { gte, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/db";
import { llmUsage } from "@/db/schema";
import { config } from "./config";

/**
 * OpenRouter's published price for meta/muse-spark-1.3-contributor, read from
 * GET https://openrouter.ai/api/v1/models on 2026-09-05: $0.10 per million
 * input tokens and $0.20 per million output tokens.
 */
export const MODEL_PRICE_USD_PER_MILLION = { input: 0.1, output: 0.2 };

/** Raised when today's house language-model spend is already at its ceiling. */
export class LlmCapReachedError extends Error {
  constructor(capUsd: number) {
    super(
      `Today's language model budget of $${capUsd.toFixed(2)} is used up. Scans resume tomorrow.`,
    );
    this.name = "LlmCapReachedError";
  }
}

/** Raised when the instance has no OpenRouter key, so nothing can be scored. */
export class LlmNotConfiguredError extends Error {
  constructor() {
    super("Set OPENROUTER_API_KEY to let this instance score leads.");
    this.name = "LlmNotConfiguredError";
  }
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** What the house has spent on the language model since midnight UTC. */
export async function llmSpendToday(): Promise<number> {
  const rows = await db()
    .select({ total: sql<string>`coalesce(sum(${llmUsage.costUsd}), 0)` })
    .from(llmUsage)
    .where(gte(llmUsage.at, startOfToday()));
  return Number(rows[0]?.total ?? 0);
}

async function assertUnderCap() {
  const cap = config().HOUSE_LLM_CAP_USD_PER_DAY;
  if ((await llmSpendToday()) >= cap) {
    throw new LlmCapReachedError(cap);
  }
}

function costOf(inputTokens: number, outputTokens: number): number {
  const { input, output } = MODEL_PRICE_USD_PER_MILLION;
  return (inputTokens * input + outputTokens * output) / 1_000_000;
}

export type LlmCall<T> = {
  purpose: string;
  projectId: string | null;
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
};

/**
 * One structured language model call, billed to the house and recorded in
 * llm_usage so the daily cap and the Data usage screen both read one table.
 */
export async function generateStructured<T>(call: LlmCall<T>): Promise<T> {
  const { OPENROUTER_API_KEY, OPENROUTER_MODEL } = config();
  if (!OPENROUTER_API_KEY) {
    throw new LlmNotConfiguredError();
  }
  await assertUnderCap();
  const openrouter = createOpenRouter({ apiKey: OPENROUTER_API_KEY });
  const result = await generateObject({
    model: openrouter.chat(OPENROUTER_MODEL),
    schema: call.schema,
    system: call.system,
    prompt: call.prompt,
  });
  const inputTokens = result.usage.inputTokens ?? 0;
  const outputTokens = result.usage.outputTokens ?? 0;
  await db()
    .insert(llmUsage)
    .values({
      projectId: call.projectId,
      purpose: call.purpose,
      inputTokens,
      outputTokens,
      costUsd: costOf(inputTokens, outputTokens).toFixed(6),
    });
  return result.object;
}
