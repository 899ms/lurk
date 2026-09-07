type MeterProps = { label: string; value: number | null };

const STEPS = [1, 2, 3, 4];

/** The 0-4 judgement scale as four segments, coloured by how high it reached. */
function tone(value: number): string {
  if (value >= 3) {
    return "bg-score-hot";
  }
  return value >= 2 ? "bg-score-warm" : "bg-score-cool";
}

/** One judgement (fit, intent or engagement) read as a filled bar, not a number. */
export function Meter({ label, value }: MeterProps) {
  const filled = value ?? 0;
  return (
    <span className="flex flex-col gap-1.5" title={`${label} ${filled} of 4`}>
      <span className="text-mono text-fg-muted">{label}</span>
      <span className="flex items-center gap-1" aria-label={`${label} ${filled} of 4`}>
        {STEPS.map((step) => (
          <span
            key={step}
            className={`h-1.5 w-5 rounded-full ${step <= filled ? tone(filled) : "bg-border"}`}
          />
        ))}
      </span>
    </span>
  );
}
