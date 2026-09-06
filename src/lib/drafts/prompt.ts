import { MAX_DRAFT_WORDS } from "./check";
import type { DraftKind, DraftMode } from "./policy";

/** Everything a reply is allowed to know: the product, and the post it answers. */
export type DraftProduct = {
  name: string;
  url: string | null;
  pain: string | null;
  solution: string | null;
  targetUsers: string | null;
  voiceProfile: string | null;
};

export type DraftLead = {
  title: string;
  body: string | null;
  subreddit: string;
  promoPolicy: string | null;
  author: string | null;
  matchedPhrase: string | null;
  reason: string | null;
  stage: string | null;
  isComment: boolean;
};

export type DraftContext = { product: DraftProduct; lead: DraftLead };

const GROUND_RULES = `You write one reply that a person will read, edit and post themselves under their own name. Never write a claim they cannot stand behind. Stay under ${MAX_DRAFT_WORDS} words. No emoji. Never open with "hope this helps". Return the reply text only, with no preamble, no signature and no quotation marks around it.`;

const STARTER_RULES = `Mode: conversation starter.
- Write 2 to 4 sentences.
- React to one specific thing they wrote, not to the general topic.
- End with one open question they would enjoy answering, and ask only that one.
- Name no product at all, not yours and not anyone else's.
- Include no link of any kind.
- Never say "I built", "I made", "I work on" or anything like it.
- Casual register, lower case is fine, unless the voice below says otherwise.`;

const PITCH_RULES = `Mode: helpful comparison.
- The reply must still be worth reading if every product name were deleted from it.
- Say plainly what decides this choice for someone in their position.
- Name at least one honest alternative and what it is genuinely good at.
- Mention the product exactly once, and say what it does not do as well as what it does.
- No superlatives, no marketing adjectives, no urgency, no emoji.`;

function kindRules(kind: DraftKind, subreddit: string): string {
  return kind === "dm"
    ? `This is a private message. The first line names the thread by its title so they know where you found them. Never ask for their email, a call, a demo or their time.`
    : `This is a public comment in r/${subreddit}. Write the comment body only.`;
}

function voiceRule(voiceProfile: string | null): string {
  return voiceProfile?.trim()
    ? `Write in this voice, copying its register and sentence length: ${voiceProfile.trim()}`
    : `Write plainly, the way one person types to another.`;
}

/** The standing instructions for one reply, in the order they are read. */
export function draftSystem(context: DraftContext, kind: DraftKind, mode: DraftMode): string {
  return [
    GROUND_RULES,
    mode === "starter" ? STARTER_RULES : PITCH_RULES,
    kindRules(kind, context.lead.subreddit),
    voiceRule(context.product.voiceProfile),
  ].join("\n\n");
}

function line(label: string, value: string | null | undefined): string | null {
  return value?.trim() ? `${label}: ${value.trim()}` : null;
}

/** The product and the post, as facts the reply has to be grounded in. */
export function draftPrompt(context: DraftContext, mode: DraftMode): string {
  const { product, lead } = context;
  const productLines = [
    line("name", product.name),
    line("site", product.url),
    line("who it is for", product.targetUsers),
    line("the problem it solves", product.pain),
    line("what it does about that", product.solution),
  ].filter((entry): entry is string => entry !== null);
  const leadLines = [
    line("subreddit", `r/${lead.subreddit}`),
    line("self-promotion rule there", lead.promoPolicy ?? "no rule stated"),
    line("author", lead.author ? `u/${lead.author}` : null),
    line("thread title", lead.title),
    line(lead.isComment ? "their comment" : "their post", lead.body ?? "(title only)"),
  ].filter((entry): entry is string => entry !== null);
  const pickedLines = [
    line("why it was picked", lead.reason),
    line("the words that matched", lead.matchedPhrase),
    line("how close they are to buying", lead.stage?.replace(/_/g, " ")),
  ].filter((entry): entry is string => entry !== null);

  return [
    mode === "starter"
      ? "The product below is context for you only. It must not appear in the reply."
      : "The product below may be mentioned exactly once.",
    "",
    "Product:",
    ...productLines,
    "",
    "What they wrote:",
    ...leadLines,
    "",
    "Why this landed in the feed:",
    ...pickedLines,
  ].join("\n");
}
