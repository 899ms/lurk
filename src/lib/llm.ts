import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { gte, sql } from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/db";
import { llmUsage } from "@/db/schema";
import { HEARTBEAT_MS } from "@/jobs/lease";
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

/**
 * How long one model call may take. A job's lease lives for LEASE_MS and is
 * re-stamped every HEARTBEAT_MS, so a call that is still silent after one whole
 * heartbeat period is hung: cutting it there ends the job well inside its own
 * lease, and the runner's retry path runs the scan again on its cadence.
 */
export const LLM_CALL_TIMEOUT_MS = HEARTBEAT_MS;

/** Raised when a single model call ran out of time and was cut off. */
export class LlmTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(
      `The language model did not answer within ${Math.round(timeoutMs / 60000)} minutes. The scan stopped and will run again.`,
    );
    this.name = "LlmTimeoutError";
  }
}

/**
 * Runs one model call under a deadline. Without this a hung provider holds a
 * job open forever, which is what stalled a scan on 2026-09-06.
 */
export async function withCallTimeout<T>(
  run: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number = LLM_CALL_TIMEOUT_MS,
): Promise<T> {
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    return await run(signal);
  } catch (error) {
    if (signal.aborted) {
      throw new LlmTimeoutError(timeoutMs);
    }
    throw error;
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

/**
 * A model that means an apostrophe sometimes writes the escape \u0000, and
 * JSON.parse turns that into a NUL character. Postgres accepts no NUL in text
 * or jsonb, so one such quote failed a whole scan on 2026-09-06. Strings are
 * cleaned everywhere they sit in the answer, nested objects and arrays
 * included, before the schema reads them.
 */
export function withoutNulCharacters(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replaceAll("\u0000", "");
  }
  if (Array.isArray(value)) {
    return value.map(withoutNulCharacters);
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, withoutNulCharacters(item)]),
    );
  }
  return value;
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
  const result = await withCallTimeout((abortSignal) =>
    generateObject({
      model: openrouter.chat(OPENROUTER_MODEL),
      schema: call.schema,
      system: call.system,
      prompt: call.prompt,
      abortSignal,
    }),
  );
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
  return call.schema.parse(withoutNulCharacters(result.object));
}
