import { CircleDashed, ScaleIcon, Search, ShoppingCart, TriangleAlert } from "lucide-react";

type StageChipProps = { stage: string | null };

const STAGES: Record<string, { label: string; Icon: typeof Search }> = {
  problem_aware: { label: "Feeling the problem", Icon: TriangleAlert },
  solution_seeking: { label: "Looking for a fix", Icon: Search },
  comparing: { label: "Comparing options", Icon: ScaleIcon },
  purchase_ready: { label: "Ready to buy", Icon: ShoppingCart },
  none: { label: "Just talking", Icon: CircleDashed },
};

/** How far along the buyer is, as one small pill with its own icon. */
export function StageChip({ stage }: StageChipProps) {
  if (!stage) {
    return null;
  }
  const known = STAGES[stage];
  const Icon = known?.Icon ?? CircleDashed;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-control bg-surface-2 px-2 py-0.5 text-mono text-fg-muted">
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {known?.label ?? stage.replace(/_/g, " ")}
    </span>
  );
}
