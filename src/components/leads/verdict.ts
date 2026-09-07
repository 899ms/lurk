import type { ReviewItem } from "@/lib/feed";

/** The scan's reason codes in the words a customer reads. */
export const REASON_LABEL: Record<string, string> = {
  supported_open_need: "Open need the product covers",
  insufficient_evidence: "Thin evidence",
  wrong_job: "Different job",
  wrong_audience: "Wrong audience",
  hard_requirement_mismatch: "Needs something the product lacks",
  seller_only: "Is selling, not buying",
  helper_only: "Is answering, not asking",
  no_active_need: "No active need",
  resolved: "Already sorted",
};

export type VerdictTone = "warm" | "cool";

export type Verdict = { tone: VerdictTone; label: string; codes: string[] };

/**
 * One plain verdict for a held item: a warm "maybe a buyer" when the person has
 * an open need and some fit, otherwise a cool "probably not". The codes explain
 * why the scan would not call it either way.
 */
export function verdictFor(item: ReviewItem): Verdict {
  const open = item.needState === "open" || item.needState === "evaluating";
  const warm = open && (item.fit ?? 0) >= 2;
  return {
    tone: warm ? "warm" : "cool",
    label: warm ? "Maybe a buyer" : "Probably not",
    codes: item.reasonCodes.map((code) => REASON_LABEL[code] ?? code.replace(/_/g, " ")),
  };
}
