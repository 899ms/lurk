const COMPOSE = ["git clone <repo> reddit-leads", "cd reddit-leads", "docker compose up"];

/** The self-host anchor: what the two ways to run it actually cost you. */
export function SelfHostBlock() {
  return (
    <section id="self-host" className="grid gap-6 rounded-card border bg-surface p-6 md:grid-cols-2">
      <div className="flex flex-col gap-3">
        <h2 className="text-h3" style={{ fontWeight: 500 }}>
          Two ways to run it
        </h2>
        <p className="text-body text-fg-muted">
          Use the hosted free tier, or run it yourself with your own AnyAPI key. Same code, same
          screens, MIT licence.
        </p>
        <p className="text-body text-fg-muted">
          Connecting an AnyAPI wallet unlocks hourly scans, comments on every thread, Reddit SEO
          with search volume, and the API. You pay AnyAPI catalog prices per call. No subscription.
        </p>
        <p className="text-body text-fg-muted">
          A daily scan of a 25 keyword project costs cents a day.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <pre className="overflow-x-auto rounded-card bg-surface-2 p-4 font-mono text-mono text-fg">
          <code>{COMPOSE.join("\n")}</code>
        </pre>
        <p className="text-small text-fg-muted">
          First run mints a free AnyAPI trial key, so a scan works before you have read the rest of
          the README.
        </p>
      </div>
    </section>
  );
}
