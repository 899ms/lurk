import { z } from "zod";

/**
 * The shapes the two scan model calls return, and the shapes the rest of the
 * scan reads. Kept apart from the calls themselves so the code that validates a
 * result and the code that asks for one do not import each other.
 */

/**
 * Triage carries no free-text reason. Nothing reads one: the disposition and
 * the code decide the reading order, and the judgement that follows writes the
 * sentence a person sees. Measured 2026-09-10, a sentence per title was most of
 * the 749k output tokens the 4,295-title sweep spent in its slowest phase.
 */
export const triageItemSchema = z.object({
  id: z.string(),
  disposition: z.enum(["read", "uncertain", "reject"]),
  priority: z.enum(["high", "medium", "low"]),
  reasonCode: z.enum([
    "explicit_ask",
    "relevant_pain",
    "switching",
    "insufficient_context",
    "wrong_topic",
    "seller_only",
    "helper_only",
    "no_active_need",
    "unavailable",
  ]),
});

export const triageSchema = z.object({ items: z.array(triageItemSchema) });

export type TriageItem = z.infer<typeof triageItemSchema>;

export const REASON_CODES = [
  "supported_open_need",
  "wrong_job",
  "wrong_audience",
  "hard_requirement_mismatch",
  "seller_only",
  "helper_only",
  "no_active_need",
  "resolved",
  "insufficient_evidence",
] as const;

export type ReasonCode = (typeof REASON_CODES)[number];

const evidenceSchema = z.object({ quote: z.string() });

export const requirementSchema = z.object({
  requirement: z.string(),
  importance: z.enum(["hard", "soft"]),
  satisfaction: z.enum(["met", "unmet", "unknown"]),
  targetEvidence: evidenceSchema,
});

export const assessmentSchema = z.object({
  id: z.string(),
  relationship: z.enum(["buyer", "seller", "helper", "discussion", "unknown"]),
  needState: z.enum(["open", "evaluating", "resolved", "no_active_need", "unknown"]),
  fit: z.number().int().min(0).max(4).nullable(),
  intent: z.number().int().min(0).max(4).nullable(),
  stage: z.enum(["none", "problem_aware", "solution_seeking", "comparing", "purchase_ready"]),
  requirements: z.array(requirementSchema),
  answerCoverage: z.enum(["none", "partial", "adequate", "unknown"]),
  unansweredAngle: z.string().nullable(),
  decision: z.enum(["qualify", "review", "reject"]),
  reasonCodes: z.array(z.enum(REASON_CODES)),
  needEvidence: evidenceSchema.nullable(),
  reason: z.string(),
});

export const judgementSchema = z.object({ items: z.array(assessmentSchema) });

/** One item as the model judged it, before any code gate is applied. */
export type Assessment = z.infer<typeof assessmentSchema>;

export type Requirement = z.infer<typeof requirementSchema>;

export type Decision = Assessment["decision"];

/**
 * One judged item as the scan uses it: the model's assessment, the decision the
 * code gates settled on, the engagement computed from the item's own age and
 * comment count, and the 0-100 feed sort order.
 *
 * `matchedPhrase` and `sellerSide` are derived here rather than asked of the
 * model, so the leads table keeps its columns.
 */
export type Judgement = Assessment & {
  engagement: number;
  score: number;
  matchedPhrase: string;
  sellerSide: boolean;
};

/** What the scorer is told about one candidate. */
export type ScorableItem = {
  id: string;
  title: string;
  subreddit: string;
  body: string;
  author: string | null;
  ageHours: number;
  upvotes: number | null;
  numComments: number | null;
  /** The post a comment is a reply to. Null when the item is the post itself. */
  parentBody: string | null;
};

export type TriageCandidate = {
  id: string;
  title: string;
  subreddit: string;
  author: string | null;
  score: number | null;
  ageHours: number;
};
