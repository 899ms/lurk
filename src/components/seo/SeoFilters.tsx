"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Hash, Search, Users } from "lucide-react";
import type { SeoFacets } from "@/lib/seo/read";

type SeoFiltersProps = { facets: SeoFacets };

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

/** Narrow the rankings to one keyword, one community, or the ones a rival is in. */
export function SeoFilters({ facets }: SeoFiltersProps) {
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
        icon={<Search className={iconClass} aria-hidden="true" />}
        name="keyword"
        value={params.get("keyword") ?? ""}
        onSelect={select}
        options={[
          { value: "", label: "All keywords" },
          ...facets.keywords.map((keyword) => ({ value: keyword, label: keyword })),
        ]}
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
        icon={<Users className={iconClass} aria-hidden="true" />}
        name="competitor"
        value={params.get("competitor") ?? ""}
        onSelect={select}
        options={[
          { value: "", label: "Any thread" },
          { value: "yes", label: "Competitor named" },
          { value: "no", label: "No competitor named" },
        ]}
      />
    </div>
  );
}
