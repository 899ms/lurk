import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import type { ThemeView } from "@/lib/insights/read";

type ThemeCardProps = { theme: ThemeView };

/** One group of leads: what these people struggle with, and who they are. */
export function ThemeCard({ theme }: ThemeCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-card border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-h3 text-fg" style={{ fontWeight: 500 }}>
          {theme.label}
        </h3>
        <span className="shrink-0 rounded-control bg-surface-2 px-2 py-0.5 text-small tabular-nums text-fg-muted">
          {theme.count} {theme.count === 1 ? "lead" : "leads"}
        </span>
      </div>
      {theme.summary ? <p className="text-body text-fg-muted">{theme.summary}</p> : null}
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center">
          {theme.faces.map((face, index) => (
            <span
              key={`${face.name ?? "unknown"}-${index}`}
              className={index === 0 ? "" : "-ml-2"}
              title={face.name ? `u/${face.name}` : undefined}
            >
              <Avatar name={face.name} src={face.avatarUrl} size={28} />
            </span>
          ))}
        </span>
        <Link
          href={`/app/leads?theme=${theme.id}`}
          className="transition-motion text-small text-fg-muted transition-colors hover:text-fg"
        >
          View leads
        </Link>
      </div>
    </div>
  );
}
