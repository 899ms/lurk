type ProofCardProps = {
  eyebrow: string;
  title: string;
  body: string;
  children: React.ReactNode;
};

/** One proof point with the real UI element it is talking about inside it. */
export function ProofCard({ eyebrow, title, body, children }: ProofCardProps) {
  return (
    <section className="flex flex-col gap-4 rounded-card border bg-surface p-6">
      <span className="text-mono uppercase tracking-wide text-fg-muted">{eyebrow}</span>
      <h3 className="text-h3" style={{ fontWeight: 500 }}>
        {title}
      </h3>
      <p className="text-small text-fg-muted">{body}</p>
      <div className="mt-auto rounded-card bg-surface-2 p-4">{children}</div>
    </section>
  );
}
