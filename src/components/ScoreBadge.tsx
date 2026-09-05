import { cn } from "@/lib/utils";

type ScoreBadgeProps = { score: number; className?: string };

/** Intent score as a small percent badge, coloured by band. */
export function ScoreBadge({ score, className }: ScoreBadgeProps) {
  const tone =
    score >= 80 ? "text-score-hot" : score >= 60 ? "text-score-warm" : "text-score-cool";
  return (
    <span className={cn("text-small tabular-nums", tone, className)} style={{ fontWeight: 500 }}>
      {score}%
    </span>
  );
}
