import "./marketing.css";

export type ArtKind = "leads" | "seo" | "insights" | "usage";

type ArtCardProps = {
  kind: ArtKind;
  eyebrow: string;
  title: string;
  body: string;
  className?: string;
};

const KIND_CLASS: Record<ArtKind, string> = {
  leads: "art-leads",
  seo: "art-seo",
  insights: "art-insights",
  usage: "art-usage",
};

/** A gradient art panel. Copy sits on a scrim so it reads at any size. */
export function ArtCard({ kind, eyebrow, title, body, className }: ArtCardProps) {
  return (
    <div
      className={`art-card relative isolate overflow-hidden rounded-card ${KIND_CLASS[kind]} ${className ?? ""}`}
    >
      <div className="art-scrim absolute inset-0 -z-10" aria-hidden="true" />
      <div className="flex h-full min-h-56 flex-col justify-between gap-8 p-6">
        <span className="art-chip w-fit rounded-control px-2.5 py-1 text-mono">{eyebrow}</span>
        <div className="flex flex-col gap-2">
          <h3 className="art-ink text-h3" style={{ fontWeight: 500 }}>
            {title}
          </h3>
          <p className="art-ink-muted max-w-md text-small">{body}</p>
        </div>
      </div>
    </div>
  );
}
