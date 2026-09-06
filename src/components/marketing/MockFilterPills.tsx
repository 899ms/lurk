import { ChevronDown } from "lucide-react";

export type MockPill = { icon: React.ReactNode; label: string };

type MockFilterPillsProps = { pills: MockPill[] };

/** The feed's filter row, drawn as faces only, the way the app renders it. */
export function MockFilterPills({ pills }: MockFilterPillsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {pills.map((pill) => (
        <span
          key={pill.label}
          className="inline-flex items-center gap-1.5 rounded-control border bg-surface py-1 pr-2 pl-2.5 text-small text-fg-muted"
        >
          {pill.icon}
          <span className="text-fg">{pill.label}</span>
          <ChevronDown className="size-3.5 shrink-0 text-fg-muted" aria-hidden="true" />
        </span>
      ))}
    </div>
  );
}
