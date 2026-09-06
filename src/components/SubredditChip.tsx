type SubredditChipProps = { name: string };

/** "r/SaaS" with the one dot of Reddit colour the design system allows. */
export function SubredditChip({ name }: SubredditChipProps) {
  return (
    <span className="inline-flex items-center gap-1 text-mono text-fg-muted">
      <span className="size-1.5 shrink-0 rounded-full bg-reddit" aria-hidden="true" />
      r/{name}
    </span>
  );
}
