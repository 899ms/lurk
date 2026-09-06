import { engagementScore, foldScore } from "./constants";
import type { Assessment, Decision, Judgement, ReasonCode, ScorableItem } from "./judgement";

/**
 * The qualification gates. They are non-compensatory and they live here, in
 * code, because a model asked for one number will always let a strong intent
 * pay for a missing fit. A lead qualifies only when the person is a buyer with
 * a need still open, the product plausibly does the job, they are looking for
 * one, and nothing they said is a hard requirement the product cannot meet.
 */

const REJECTING: ReasonCode[] = [
  "seller_only",
  "helper_only",
  "resolved",
  "no_active_need",
  "hard_requirement_mismatch",
  "wrong_job",
];

/**
 * The first gate this assessment fails, as the reason code that names it, or
 * null when it passes every gate. Ordered so the earliest, plainest failure is
 * the one reported.
 */
export function gateFailure(item: Assessment): ReasonCode | null {
  if (item.relationship === "seller") {
    return "seller_only";
  }
  if (item.relationship === "helper") {
    return "helper_only";
  }
  if (item.relationship !== "buyer") {
    return item.relationship === "discussion" ? "no_active_need" : "insufficient_evidence";
  }
  if (item.needState === "resolved") {
    return "resolved";
  }
  if (item.needState === "no_active_need") {
    return "no_active_need";
  }
  if (item.needState === "unknown") {
    return "insufficient_evidence";
  }
  if (item.fit === null || item.fit === 2) {
    return "insufficient_evidence";
  }
  if (item.fit < 3) {
    return "wrong_job";
  }
  if (item.intent === null) {
    return "insufficient_evidence";
  }
  if (item.intent < 2) {
    return "no_active_need";
  }
  if (item.requirements.some((need) => need.importance === "hard" && need.satisfaction === "unmet")) {
    return "hard_requirement_mismatch";
  }
  return null;
}

function withCode(codes: ReasonCode[], code: ReasonCode): ReasonCode[] {
  return codes.includes(code) ? codes : [...codes, code];
}

/**
 * The decision the scan acts on. The model may reject or send to review on its
 * own reading; only the gates may let something qualify.
 */
export function decide(item: Assessment): { decision: Decision; reasonCodes: ReasonCode[] } {
  const failure = gateFailure(item);
  if (!failure) {
    return { decision: item.decision, reasonCodes: item.reasonCodes };
  }
  const decision: Decision = REJECTING.includes(failure) ? "reject" : "review";
  return { decision, reasonCodes: withCode(item.reasonCodes, failure) };
}

/** Sends an item the evidence does not support to review, never to the feed. */
export function downgradeToReview(item: Judgement, code: ReasonCode): Judgement {
  if (item.decision === "reject") {
    return { ...item, reasonCodes: withCode(item.reasonCodes, code) };
  }
  return { ...item, decision: "review", reasonCodes: withCode(item.reasonCodes, code) };
}

/**
 * One assessment as the scan uses it: the gated decision, the engagement this
 * code computed, the feed sort order, and the two columns the leads table has
 * always held.
 */
export function judge(item: Assessment, source: ScorableItem): Judgement {
  const engagement = engagementScore(source.ageHours, source.numComments);
  const { decision, reasonCodes } = decide(item);
  return {
    ...item,
    decision,
    reasonCodes,
    engagement,
    score: foldScore(item.fit, item.intent, engagement),
    matchedPhrase: item.needEvidence?.quote ?? "",
    sellerSide: item.relationship === "seller",
  };
}
