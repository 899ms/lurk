import { draftDefect, retryInstruction } from "./check";
import { pitchAllowed, pitchRefusal, type DraftKind, type DraftMode } from "./policy";
import { draftPrompt, draftSystem, type DraftContext } from "./prompt";

/** Raised when the subreddit's own rule rules out mentioning a product. */
export class PitchNotAllowedError extends Error {
  constructor(subreddit: string, promoPolicy: string | null) {
    super(pitchRefusal(subreddit, promoPolicy));
    this.name = "PitchNotAllowedError";
  }
}

export type DraftWriter = (system: string, prompt: string) => Promise<string>;

/**
 * One reply, assembled from the project and the post, checked against the rules
 * of its mode, and asked for once more when the first answer breaks one.
 */
export async function composeDraft(
  context: DraftContext,
  kind: DraftKind,
  mode: DraftMode,
  write: DraftWriter,
): Promise<string> {
  if (mode === "pitch" && !pitchAllowed(context.lead.promoPolicy)) {
    throw new PitchNotAllowedError(context.lead.subreddit, context.lead.promoPolicy);
  }
  const system = draftSystem(context, kind, mode);
  const prompt = draftPrompt(context, mode);
  const first = (await write(system, prompt)).trim();
  const defect = draftDefect(first, kind, mode, context.lead.title);
  if (!defect) {
    return first;
  }
  const second = await write(system, `${prompt}\n\n${retryInstruction(defect)}`);
  return second.trim();
}
