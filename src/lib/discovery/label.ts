import { z } from "zod";
import { generateStructured } from "@/lib/llm";
import { DISCOVERY_LABEL_SYSTEM } from "@/lib/prompts";

/**
 * The one model pass in discovery. It reads deduplicated Google results and
 * says, for each, whether it is a person with this product's problem, which
 * place it is about, and what any named product is to us. It is given ids and
 * must answer with them, so an answer about a thread we never showed it - the
 * one way this call could invent a community out of nothing - is dropped.
 */

/** What one thread is worth as evidence. `unlabeled` is ours, not the model's. */
export type Relevance = "unlabeled" | "relevant" | "plausible" | "irrelevant";

/** What a named product or site is to this product. */
export type EntityRole =
  | "direct_substitute"
  | "booking_alternative"
  | "supplier"
  | "reference"
  | "irrelevant";

export type LabeledEntity = { name: string; role: EntityRole };

export type ThreadLabel = {
  id: string;
  relevance: Exclude<Relevance, "unlabeled">;
  destination: string | null;
  entities: LabeledEntity[];
};

/** One thread as the model sees it: an id it must cite, and the text we bought. */
export type LabelCandidate = {
  id: string;
  subreddit: string;
  title: string;
  snippet: string;
};

const labelSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      relevance: z.enum(["relevant", "plausible", "irrelevant"]),
      destination: z.string().nullable(),
      entities: z.array(
        z.object({
          name: z.string(),
          role: z.enum([
            "direct_substitute",
            "booking_alternative",
            "supplier",
            "reference",
            "irrelevant",
          ]),
        }),
      ),
    }),
  ),
});

/**
 * Only labels about threads we actually supplied, one per thread. An id we
 * never sent is a label with no evidence behind it, and the same id twice is
 * one thread claiming two verdicts, so the first answer stands.
 */
export function keepCitedLabels(labels: ThreadLabel[], knownIds: string[]): ThreadLabel[] {
  const known = new Set(knownIds);
  const seen = new Set<string>();
  return labels.filter((label) => {
    if (!known.has(label.id) || seen.has(label.id)) {
      return false;
    }
    seen.add(label.id);
    return true;
  });
}

function candidateText(candidate: LabelCandidate): string {
  return [
    `id: ${candidate.id}`,
    `community: r/${candidate.subreddit}`,
    `title: ${candidate.title}`,
    `snippet: ${candidate.snippet}`,
  ].join("\n");
}

export type LabelInput = {
  projectId: string;
  /** The product facts the relevance judgement is made against. */
  productText: string;
  candidates: LabelCandidate[];
};

/** Labels one round of deduplicated threads in a single call. */
export async function labelThreads(input: LabelInput): Promise<ThreadLabel[]> {
  if (input.candidates.length === 0) {
    return [];
  }
  const answer = await generateStructured({
    purpose: "discovery_label",
    projectId: input.projectId,
    schema: labelSchema,
    system: DISCOVERY_LABEL_SYSTEM,
    prompt: [
      "PRODUCT",
      input.productText,
      "",
      "RESULTS",
      input.candidates.map(candidateText).join("\n\n"),
    ].join("\n"),
  });
  return keepCitedLabels(
    answer.results,
    input.candidates.map((candidate) => candidate.id),
  );
}
