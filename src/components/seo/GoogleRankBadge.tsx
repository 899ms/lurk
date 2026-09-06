type GoogleRankBadgeProps = { position: number | null };

/** Where Google put this thread, under Google's own mark. */
export function GoogleRankBadge({ position }: GoogleRankBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-control border bg-surface-2 px-2 py-1"
      title="Position in Google results"
    >
      {/* A four-colour mark, served as one flat file rather than redrawn in code. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brands/google.svg" alt="Google" width={12} height={12} />
      <span className="text-small tabular-nums text-fg" style={{ fontWeight: 500 }}>
        {position === null ? "-" : `#${position}`}
      </span>
    </span>
  );
}
