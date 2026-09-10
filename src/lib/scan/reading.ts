import { inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { postReadings } from "@/db/schema";
import { generateStructured } from "@/lib/llm";
import { READING_SYSTEM } from "@/lib/prompts";
import { FETCH_CONCURRENCY } from "./constants";
import { contentHash } from "./evaluations";
import { isSentinel } from "./evidence";
import { judge } from "./gates";
import type { Assessment, Judgement, ScorableItem } from "./judgement";

/**
 * The shared reading: one small model call per post, before any product is
 * considered, answering who is speaking and whether they are asking for
 * anything. Every project watching a post reads the same answer, so the first
 * project to see it pays for all of them.
 *
 * It exists to keep the judgement call away from posts no product would ever
 * qualify. Over the 540 judged posts replayed in .context/embed-test/report3.md,
 * requiring a buyer who is asking cut 55 to 78% of the rejections on all five
 * products and lost no lead on any of them, and it agreed with the judge on
 * every post the judge called a seller and every post the judge qualified.
 */

const readingSchema = z.object({
  speaker: z.enum(["buyer", "seller", "helper", "discussion", "unknown"]),
  asking: z.boolean(),
  need: z.string(),
  category: z.string(),
  constraints: z.array(z.string()),
});

export type Reading = z.infer<typeof readingSchema>;

/**
 * Bumped when READING_SYSTEM or this schema changes what a stored reading
 * means. A reading made under an older version is read again.
 */
export const READING_VERSION = "2026-09-07.1";

/** The most characters of one body the reading sees, as measured. */
const READING_CHAR_BUDGET = 6000;

/** The hash of the post's own words. Replies do not change who is speaking. */
export function readingHash(title: string, body: string | null): string {
  return contentHash([title, body]);
}

/** True when this reading found a buyer who is looking for something. */
export function isAskingBuyer(reading: Reading): boolean {
  return reading.asking && reading.speaker === "buyer";
}

/** The readings already held for these posts, still current for their text. */
async function cached(items: ScorableItem[]): Promise<Map<string, Reading>> {
  if (items.length === 0) {
    return new Map();
  }
  const rows = await db()
    .select()
    .from(postReadings)
    .where(inArray(postReadings.postId, items.map((item) => item.id)));
  const wanted = new Map(items.map((item) => [item.id, readingHash(item.title, item.body)]));
  return new Map(
    rows
      .filter(
        (row) =>
          row.readingVersion === READING_VERSION && row.contentHash === wanted.get(row.postId),
      )
      .map((row) => [
        row.postId,
        {
          speaker: row.speaker as Reading["speaker"],
          asking: row.asking,
          need: row.need,
          category: row.category,
          constraints: row.constraints,
        },
      ]),
  );
}

async function store(item: ScorableItem, reading: Reading): Promise<void> {
  await db()
    .insert(postReadings)
    .values({
      postId: item.id,
      ...reading,
      contentHash: readingHash(item.title, item.body),
      readingVersion: READING_VERSION,
      readAt: new Date(),
    })
    .onConflictDoUpdate({
      target: postReadings.postId,
      set: {
        speaker: sql`excluded.speaker`,
        asking: sql`excluded.asking`,
        need: sql`excluded.need`,
        category: sql`excluded.category`,
        constraints: sql`excluded.constraints`,
        contentHash: sql`excluded.content_hash`,
        readingVersion: sql`excluded.reading_version`,
        readAt: sql`excluded.read_at`,
      },
    });
}

async function readOne(projectId: string, item: ScorableItem): Promise<Reading | null> {
  try {
    const reading = await generateStructured({
      purpose: "reading",
      projectId,
      schema: readingSchema,
      system: READING_SYSTEM,
      prompt: `Title: ${item.title}\n\n${item.body.slice(0, READING_CHAR_BUDGET)}`,
    });
    await store(item, reading);
    return reading;
  } catch {
    return null;
  }
}

/**
 * A reading for every post that has one. A post the model could not read is
 * left out and goes to the judge as it always did: an outage upstream must cost
 * money, never a lead.
 */
export async function readPosts(
  projectId: string,
  items: ScorableItem[],
): Promise<Map<string, Reading>> {
  const live = items.filter((item) => !isSentinel(item));
  const readings = await cached(live);
  const todo = live.filter((item) => !readings.has(item.id));
  for (let start = 0; start < todo.length; start += FETCH_CONCURRENCY) {
    const batch = todo.slice(start, start + FETCH_CONCURRENCY);
    const done = await Promise.all(batch.map((item) => readOne(projectId, item)));
    batch.forEach((item, index) => {
      const reading = done[index];
      if (reading) {
        readings.set(item.id, reading);
      }
    });
  }
  return readings;
}

/** What the reading found, in the words the verdict is written in. */
const SPEAKER_PHRASE: Record<Reading["speaker"], string> = {
  buyer: "someone talking about the topic without looking for anything",
  seller: "someone announcing or promoting something of their own",
  helper: "someone answering others rather than asking",
  discussion: "a discussion with nobody asking for anything",
  unknown: "nobody clearly asking for anything",
};

/**
 * The verdict for a post the reading kept away from the judge. It claims only
 * what the reading saw: who was speaking, and that they were not asking. Every
 * score is left null, so the existing gates in gates.ts settle the decision
 * from that reading alone and no second set of rules has to agree with them.
 */
function notAsking(reading: Reading): Assessment {
  return {
    id: "",
    relationship: reading.speaker,
    needState: reading.asking ? "unknown" : "no_active_need",
    fit: null,
    intent: null,
    stage: "none",
    requirements: [],
    answerCoverage: "unknown",
    unansweredAngle: null,
    decision: "reject",
    reasonCodes: [],
    needEvidence: null,
    reason: `A first reading of this post found ${SPEAKER_PHRASE[reading.speaker]}, so it was not scored against the product.`,
  };
}

/**
 * The posts the judge should read, and the verdicts for the ones it should not.
 * A post with no reading is judged, because only a reading that says the author
 * is not a buyer asking for something may keep a post off the judge's list.
 */
export function splitByReading(
  items: ScorableItem[],
  readings: Map<string, Reading>,
): { toJudge: ScorableItem[]; cut: Judgement[] } {
  const toJudge: ScorableItem[] = [];
  const cut: Judgement[] = [];
  for (const item of items) {
    const reading = readings.get(item.id);
    if (!reading || isAskingBuyer(reading)) {
      toJudge.push(item);
      continue;
    }
    cut.push(judge({ ...notAsking(reading), id: item.id }, item));
  }
  return { toJudge, cut };
}
