type MockButtonProps = { label: string; tone?: "quiet" | "solid" };

/** A non-interactive button face, used only inside the marketing app mocks. */
export function MockButton({ label, tone = "quiet" }: MockButtonProps) {
  return (
    <span
      className={
        tone === "solid"
          ? "rounded-control bg-primary px-2.5 py-1 text-mono text-primary-fg"
          : "rounded-control border bg-surface px-2.5 py-1 text-mono text-fg-muted"
      }
    >
      {label}
    </span>
  );
}
