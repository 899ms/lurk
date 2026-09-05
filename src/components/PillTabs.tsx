"use client";

import { cn } from "@/lib/utils";

export type PillTab = { id: string; label: string };

type PillTabsProps = {
  tabs: PillTab[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
};

/** A pill tab strip: muted track, active tab raised onto the surface. */
export function PillTabs({ tabs, activeId, onSelect, className }: PillTabsProps) {
  return (
    <div
      role="tablist"
      className={cn("inline-flex gap-1 rounded-control bg-surface-2 p-1", className)}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === activeId}
          onClick={() => onSelect(tab.id)}
          className={cn(
            "transition-motion rounded-control px-3 py-1.5 text-small transition-colors",
            tab.id === activeId
              ? "border bg-surface text-fg"
              : "border border-transparent text-fg-muted hover:text-fg",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
