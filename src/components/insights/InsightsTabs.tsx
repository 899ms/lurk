import Link from "next/link";
import { Layers, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export type InsightsTab = "themes" | "communities";

type InsightsTabsProps = { active: InsightsTab; projectId: string };

const TABS = [
  { id: "themes" as const, label: "Pain themes", Icon: Layers },
  { id: "communities" as const, label: "Communities", Icon: Users },
];

/** The two halves of Insights, as a pill strip that keeps the project in the URL. */
export function InsightsTabs({ active, projectId }: InsightsTabsProps) {
  return (
    <div className="inline-flex gap-1 rounded-control bg-surface-2 p-1">
      {TABS.map(({ id, label, Icon }) => (
        <Link
          key={id}
          href={`/app/insights?project=${projectId}&tab=${id}`}
          aria-current={id === active ? "page" : undefined}
          className={cn(
            "transition-motion inline-flex items-center gap-1.5 rounded-control px-3 py-1.5 text-small transition-colors",
            id === active
              ? "border bg-surface text-fg"
              : "border border-transparent text-fg-muted hover:text-fg",
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
          {label}
        </Link>
      ))}
    </div>
  );
}
