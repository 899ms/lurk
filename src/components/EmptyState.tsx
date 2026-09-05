type EmptyStateProps = { title: string; sentence: string };

/** One heading and one sentence. Used by every screen a later layer fills in. */
export function EmptyState({ title, sentence }: EmptyStateProps) {
  return (
    <div className="flex flex-col gap-2 rounded-card border bg-surface p-8">
      <h2 className="text-h3" style={{ fontWeight: 500 }}>
        {title}
      </h2>
      <p className="text-body text-fg-muted">{sentence}</p>
    </div>
  );
}
