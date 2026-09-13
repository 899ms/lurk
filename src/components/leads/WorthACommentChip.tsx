import { MessagesSquare } from "lucide-react";

type WorthACommentChipProps = { kind: string };

/**
 * Marks a lead nobody asked for: a thread the product plainly fits where the
 * people in it are talking rather than shopping. It sits beside the stage pill
 * so the feed says, in one glance, which cards are an ask and which are a
 * conversation to join.
 */
export function WorthACommentChip({ kind }: WorthACommentChipProps) {
  if (kind !== "context") {
    return null;
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-control bg-surface-2 px-2 py-0.5 text-mono text-fg-muted">
      <MessagesSquare className="size-3.5 shrink-0" aria-hidden="true" />
      Worth a comment
    </span>
  );
}
