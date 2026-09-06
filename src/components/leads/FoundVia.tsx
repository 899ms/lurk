/** How a lead reached the feed, named the way the usage page names it. */
const LABEL: Record<string, string> = {
  search: "Reddit search",
  scoped: "Community search",
  listing: "Community listing",
  serp: "Google",
};

export type LeadSource = { kind: string; key: string };

/**
 * Every way this post was found, not just the first. A post that four sources
 * agreed on is a different thing from one a single query happened to catch,
 * and the plan is ranked on exactly these rows.
 */
export function FoundVia({ sources }: { sources: LeadSource[] }) {
  if (sources.length === 0) {
    return null;
  }
  return (
    <p className="text-mono text-fg-muted">
      Found via{" "}
      {sources.map((source, index) => (
        <span key={`${source.kind} ${source.key}`}>
          {index > 0 ? ", " : ""}
          {LABEL[source.kind] ?? source.kind}
          <span className="text-fg-muted"> ({source.key})</span>
        </span>
      ))}
    </p>
  );
}
