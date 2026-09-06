"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Filter, Hash, Target } from "lucide-react";
import { FEED_WINDOWS, type FeedFacets } from "@/lib/feed";

type FeedFiltersProps = { facets: FeedFacets };

const WINDOW_LABELS: Record<number, string> = { 1: "Today", 7: "7 days", 30: "30 days" };

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  hidden: "Hidden",
  not_fit: "Not a fit",
};

function label(stage: string): string {
  return stage.replace(/_/g, " ");
}

type PillProps = {
  icon: React.ReactNode;
  name: string;
  value: string;
  options: { value: string; label: string }[];
  onSelect: (name: string, value: string) => void;
};

function FilterPill({ icon, name, value, options, onSelect }: PillProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-control border bg-surface py-1 pr-1 pl-2.5 text-small text-fg-muted">
      {icon}
      <select
        aria-label={name}
        value={value}
        onChange={(event) => onSelect(name, event.target.value)}
        className="bg-surface text-small text-fg"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </span>
  );
}

/** The row of pills over the feed: when, where, how far along, and what state. */
export function FeedFilters({ facets }: FeedFiltersProps) {
  const router = useRouter();
  const params = useSearchParams();

  function select(name: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) {
      next.set(name, value);
    } else {
      next.delete(name);
    }
    router.push(`?${next.toString()}`);
  }

  const iconClass = "size-3.5 shrink-0 text-fg-muted";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterPill
        icon={<CalendarDays className={iconClass} aria-hidden="true" />}
        name="days"
        value={params.get("days") ?? "30"}
        onSelect={select}
        options={FEED_WINDOWS.map((days) => ({
          value: String(days),
          label: WINDOW_LABELS[days],
        }))}
      />
      <FilterPill
        icon={<Hash className={iconClass} aria-hidden="true" />}
        name="subreddit"
        value={params.get("subreddit") ?? ""}
        onSelect={select}
        options={[
          { value: "", label: "All subreddits" },
          ...facets.subreddits.map((name) => ({ value: name.toLowerCase(), label: `r/${name}` })),
        ]}
      />
      <FilterPill
        icon={<Target className={iconClass} aria-hidden="true" />}
        name="stage"
        value={params.get("stage") ?? ""}
        onSelect={select}
        options={[
          { value: "", label: "Any stage" },
          ...facets.stages.map((stage) => ({ value: stage, label: label(stage) })),
        ]}
      />
      <FilterPill
        icon={<Filter className={iconClass} aria-hidden="true" />}
        name="status"
        value={params.get("status") ?? "new"}
        onSelect={select}
        options={Object.entries(STATUS_LABELS).map(([value, text]) => ({ value, label: text }))}
      />
    </div>
  );
}
