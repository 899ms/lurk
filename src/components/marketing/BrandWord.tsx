import { BrandImage } from "./BrandImage";

export const BRAND_MARKS = {
  Reddit: "/brands/reddit.svg",
  Google: "/brands/google.svg",
  "Google AI Overviews": "/brands/gemini.svg",
  ChatGPT: "/brands/chatgpt.svg",
  Perplexity: "/brands/perplexity.svg",
  Claude: "/brands/claude.svg",
  Slack: "/brands/slack.svg",
  Discord: "/brands/discord.svg",
} as const;
export type BrandName = keyof typeof BRAND_MARKS;

/** A platform named in running text always carries its mark. */
export function BrandWord({ name, label }: { name: BrandName; label?: string }) {
  return (
    <span className="brand-word">
      <BrandImage name={name} src={BRAND_MARKS[name]} />
      {label ?? name}
    </span>
  );
}
