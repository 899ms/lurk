import { generateStructured } from "@/lib/llm";
import { JUDGEMENT_SYSTEM, TRIAGE_SYSTEM } from "@/lib/prompts";
import { SCORE_BATCH_SIZE } from "./constants";
import { describeCandidate, describeItem } from "./evidence";
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

/**
 * One call over every new title. Costs no Reddit data, and decides which posts
 * are worth buying in full. The list comes back in the order the caller should
 * spend its reading budget: the model's ranking inside each priority tier.
 */
export async function triageTitles(
  projectId: string,
  product: ProfileText,
  candidates: TriageCandidate[],
): Promise<TriageItem[]> {
  if (candidates.length === 0) {
    return [];
  }
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
 * The ids to read, best first: the triage's own order inside each priority
 * tier, with the rejects left out. Uncertain candidates stay in the queue.
 */
export function readOrder(triage: TriageItem[]): string[] {
  const keep = triage.filter((item) => item.disposition !== "reject");
  return PRIORITY_ORDER.flatMap((priority) =>
    keep.filter((item) => item.priority === priority).map((item) => item.id),
  );
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
 * quote that is not in the supplied text sends the item to review.
 */
export async function judgeItems(
  projectId: string,
  product: ProfileText,
  items: ScorableItem[],
): Promise<Judgement[]> {
  const out: Judgement[] = [];
  for (let start = 0; start < items.length; start += SCORE_BATCH_SIZE) {
    const batch = items.slice(start, start + SCORE_BATCH_SIZE);
    const bySource = new Map(batch.map((item) => [item.id, item]));
    for (const assessment of await judgeBatch(projectId, product, batch)) {
      const source = bySource.get(assessment.id) as ScorableItem;
      out.push(withCheckedEvidence(judge(assessment, source), describeItem(source)));
    }
  }
  return out;
}
