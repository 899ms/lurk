import { cn } from "@/lib/utils";

type StatCardProps = { label: string; value: string; caption?: string; className?: string };

/** Label, a large number, and a muted caption. */
export function StatCard({ label, value, caption, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-6 rounded-card border bg-surface-2 p-5",
        className,
      )}
    >
      <span className="text-body text-fg-muted">{label}</span>
      <span className="text-[40px] leading-none tabular-nums" style={{ fontWeight: 500 }}>
        {value}
      </span>
      {caption ? <span className="text-small text-fg-muted">{caption}</span> : null}
    </div>
  );
}
