type PromoPolicyBadgeProps = { policy: string | null; rulesText: string | null };

/** The subreddit's self-promotion rule in one line, its full rules on hover. */
export function PromoPolicyBadge({ policy, rulesText }: PromoPolicyBadgeProps) {
  if (!policy) {
    return null;
  }
  return (
    <span
      className="rounded-control border px-1.5 py-0.5 text-mono text-fg-muted"
      title={rulesText ?? undefined}
    >
      {policy}
    </span>
  );
}
