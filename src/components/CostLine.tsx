import { cn } from "@/lib/utils";

type CostLineProps = { costUsd: number; sku: string; requestId?: string | null; className?: string };

/** "$0.0016 via reddit.search", with the AnyAPI request id on hover. */
export function CostLine({ costUsd, sku, requestId, className }: CostLineProps) {
  return (
    <span
      className={cn("font-mono text-mono text-fg-muted", className)}
      title={requestId ? `AnyAPI request ${requestId}` : undefined}
    >
      ${costUsd.toFixed(4)} via {sku}
    </span>
  );
}
