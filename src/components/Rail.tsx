"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, Lightbulb, Radar, Receipt, Search, Settings, Swords } from "lucide-react";
import { cn } from "@/lib/utils";

/** One icon per destination, so the rail reads at a glance. */
const ICONS = {
  radar: Radar,
  search: Search,
  lightbulb: Lightbulb,
  swords: Swords,
  box: Box,
  receipt: Receipt,
  settings: Settings,
} as const;

export type RailIcon = keyof typeof ICONS;

export type RailItem = { href: string; label: string; icon: RailIcon; count?: number };
export type RailGroup = { label: string; items: RailItem[] };

type RailProps = { groups: RailGroup[]; children?: React.ReactNode };

/** Left navigation, grouped Engage / Research / Setup, with count pills. */
export function Rail({ groups, children }: RailProps) {
  const pathname = usePathname();
  return (
    <nav
      className="flex shrink-0 flex-col gap-6 border-r bg-bg px-4 py-5"
      style={{ width: "var(--rail-width)" }}
    >
      {children}
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <span className="px-2 pb-1 text-[11px] uppercase tracking-wide text-fg-muted">
            {group.label}
          </span>
          {group.items.map((item) => {
            const active = pathname === item.href;
            const Icon = ICONS[item.icon];
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "transition-motion flex items-center justify-between gap-2 rounded-control px-2 py-1.5 text-body transition-colors",
                  active ? "bg-surface-2 text-fg" : "text-fg-muted hover:text-fg",
                )}
              >
                <span className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0 text-fg-muted" aria-hidden="true" />
                  {item.label}
                </span>
                {item.count === undefined ? null : (
                  <span className="rounded-control bg-surface-2 px-1.5 text-small tabular-nums text-fg-muted">
                    {item.count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
