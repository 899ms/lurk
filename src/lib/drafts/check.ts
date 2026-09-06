import type { DraftKind, DraftMode } from "./policy";

/** The three ways a draft comes back unusable and is asked for again. */
export type DraftDefect = "link" | "too_long" | "echoes_title";

export const MAX_DRAFT_WORDS = 120;

const LINK = /https?:\/\/|www\.[a-z0-9-]|[a-z0-9-]+\.(com|io|net|org|dev|app|co|ai)\b/i;

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function normalized(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * What is wrong with a draft, or null when it is fine. A direct message is
 * expected to name the thread, so only a public comment is checked for the
 * title coming back word for word.
 */
export function draftDefect(
  text: string,
  kind: DraftKind,
  mode: DraftMode,
  title: string,
): DraftDefect | null {
  if (mode === "starter" && LINK.test(text)) {
    return "link";
  }
  if (wordCount(text) > MAX_DRAFT_WORDS) {
    return "too_long";
  }
  if (kind === "comment" && title.trim() && normalized(text).includes(normalized(title))) {
    return "echoes_title";
  }
  return null;
}

const DEFECT_SENTENCE: Record<DraftDefect, string> = {
  link: "it included a link, and this reply never carries one",
  too_long: `it ran past ${MAX_DRAFT_WORDS} words`,
  echoes_title: "it repeated the post title word for word",
};

/** What to tell the model when asking for the reply a second time. */
export function retryInstruction(defect: DraftDefect): string {
  return `Your first attempt was thrown away because ${DEFECT_SENTENCE[defect]}. Write it again without that.`;
}
