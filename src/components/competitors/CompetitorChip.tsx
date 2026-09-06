import { Favicon } from "@/components/Favicon";
import { competitorHost } from "@/lib/competitors/host";

type CompetitorChipProps = { name: string; count?: number };

/** A competitor, wearing its own icon when its name is a domain. */
export function CompetitorChip({ name, count }: CompetitorChipProps) {
  return (
    <span className="inline-flex items-center gap-2 rounded-control border bg-surface px-2.5 py-1.5 text-small text-fg">
      <Favicon url={competitorHost(name)} name={name} size={20} />
      {name}
      {count === undefined ? null : (
        <span className="tabular-nums text-fg-muted">{count}</span>
      )}
    </span>
  );
}
