type SectionHeadProps = { eyebrow: string; title: string; lines: string[] };

/** Eyebrow and heading on the left, the plain-language claim on the right. */
export function SectionHead({ eyebrow, title, lines }: SectionHeadProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 md:gap-10">
      <div className="flex flex-col gap-3">
        <span className="text-small text-fg-muted">{eyebrow}</span>
        <h2 className="text-h2" style={{ fontWeight: 500 }}>
          {title}
        </h2>
      </div>
      <div className="flex flex-col gap-1 self-end text-body text-fg-muted">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  );
}
