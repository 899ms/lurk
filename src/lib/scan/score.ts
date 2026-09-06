import { generateStructured } from "@/lib/llm";
import { JUDGEMENT_SYSTEM, TRIAGE_SYSTEM } from "@/lib/prompts";
import { SCORE_BATCH_SIZE, TRIAGE_BATCH_SIZE } from "./constants";
import { describeCandidate, describeItem, isSentinel } from "./evidence";
import { judge } from "./gates";
import {
  judgementSchema,
  triageSchema,
  type Assessment,
  type Judgement,
  type ScorableItem,
  type TriageCandidate,
  type TriageItem,
} from "./judgement";
import { reconcileIds, withCheckedEvidence } from "./validate";

export type ProfileText = string;

const PRIORITY_ORDER = ["high", "medium", "low"] as const;

/** A candidate the triage returned no verdict for is unread, never rejected. */
function unevaluated(id: string): TriageItem {
  return {
    id,
    disposition: "uncertain",
    priority: "low",
    reasonCode: "insufficient_context",
    reason: "The triage returned no verdict for this candidate.",
  };
}

async function triageBatch(
  projectId: string,
  product: ProfileText,
  candidates: TriageCandidate[],
): Promise<TriageItem[]> {
  const result = await generateStructured({
    purpose: "triage",
    projectId,
    schema: triageSchema,
    system: TRIAGE_SYSTEM,
    prompt: [
      "Product:",
      product,
      "",
      "Candidates:",
      ...candidates.map(describeCandidate),
    ].join("\n"),
  });
  const { items, missing } = reconcileIds(
    result.items,
    candidates.map((candidate) => candidate.id),
  );
  return [...items, ...missing.map(unevaluated)];
}

/**
 * Reads every new title in batches. Costs no Reddit data, and decides which
 * posts are worth buying in full. The list comes back in the order the caller
 * should spend its reading budget once readOrder has put every batch's verdicts
 * into one order.
 */
export async function triageTitles(
  projectId: string,
  product: ProfileText,
  candidates: TriageCandidate[],
): Promise<TriageItem[]> {
  const out: TriageItem[] = [];
  for (let start = 0; start < candidates.length; start += TRIAGE_BATCH_SIZE) {
    out.push(
      ...(await triageBatch(projectId, product, candidates.slice(start, start + TRIAGE_BATCH_SIZE))),
    );
  }
  return out;
}

/** What a candidate's own facts say about how urgent reading it is. */
export type ReadFacts = { ageHours: number; upvotes: number | null };

/**
 * The ids to read, best first, in one order over everything this scan found,
 * never in the order the sources happened to return them. A candidate the
 * triage wants read outranks one it is unsure about; inside that, the model's
 * own priority; then the younger post, because a thread cools while it waits;
 * then the more upvoted one. Rejects are left out and uncertain ones stay in
 * the queue.
 */
export function readOrder(triage: TriageItem[], facts: Map<string, ReadFacts>): string[] {
  const rank = (item: TriageItem) => ({
    disposition: item.disposition === "read" ? 0 : 1,
    priority: PRIORITY_ORDER.indexOf(item.priority),
    ageHours: facts.get(item.id)?.ageHours ?? Number.POSITIVE_INFINITY,
    upvotes: facts.get(item.id)?.upvotes ?? 0,
  });
  return triage
    .filter((item) => item.disposition !== "reject")
    .map((item) => ({ item, key: rank(item) }))
    .sort(
      (a, b) =>
        a.key.disposition - b.key.disposition ||
        a.key.priority - b.key.priority ||
        a.key.ageHours - b.key.ageHours ||
        b.key.upvotes - a.key.upvotes,
    )
    .map((entry) => entry.item.id);
}

async function judgeBatch(
  projectId: string,
  product: ProfileText,
  batch: ScorableItem[],
): Promise<Assessment[]> {
  const result = await generateStructured({
    purpose: "score",
    projectId,
    schema: judgementSchema,
    system: JUDGEMENT_SYSTEM,
    prompt: ["Product:", product, "", "Candidates:", batch.map(describeItem).join("\n---\n")].join(
      "\n",
    ),
  });
  const { items, missing } = reconcileIds(
    result.items,
    batch.map((item) => item.id),
  );
  if (missing.length === 0) {
    return items;
  }
  const retry = batch.filter((item) => missing.includes(item.id));
  const second = await generateStructured({
    purpose: "score",
    projectId,
    schema: judgementSchema,
    system: JUDGEMENT_SYSTEM,
    prompt: ["Product:", product, "", "Candidates:", retry.map(describeItem).join("\n---\n")].join(
      "\n",
    ),
  });
  return [
    ...items,
    ...reconcileIds(
      second.items,
      retry.map((item) => item.id),
    ).items,
  ];
}

/**
 * Judges items in batches. Every answer is checked against the batch it came
 * from and against the text it was shown: a foreign id is dropped, an id the
 * model skipped is asked for once more and otherwise left unevaluated, and a
 * quote that is not in the supplied text sends the item to review. An item
 * Reddit has taken away is never sent at all, and so never judged.
 */
export async function judgeItems(
  projectId: string,
  product: ProfileText,
  items: ScorableItem[],
): Promise<Judgement[]> {
  const live = items.filter((item) => !isSentinel(item));
  const out: Judgement[] = [];
  for (let start = 0; start < live.length; start += SCORE_BATCH_SIZE) {
    const batch = live.slice(start, start + SCORE_BATCH_SIZE);
    const bySource = new Map(batch.map((item) => [item.id, item]));
    for (const assessment of await judgeBatch(projectId, product, batch)) {
      const source = bySource.get(assessment.id) as ScorableItem;
      out.push(withCheckedEvidence(judge(assessment, source), source));
    }
  }
  return out;
}
