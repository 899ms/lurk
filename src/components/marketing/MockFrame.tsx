import { MOCK_RAIL } from "./mockContent";

type MockFrameProps = {
  active: string;
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

/** The app chrome every marketing mock sits inside: rail, top bar, one screen. */
export function MockFrame({ active, title, actions, children }: MockFrameProps) {
  return (
    <div className="overflow-hidden rounded-frame border bg-surface shadow-sm">
      <div className="flex">
        <aside
          className="hidden shrink-0 flex-col gap-5 border-r bg-bg px-3 py-4 md:flex"
          style={{ width: "var(--rail-width)" }}
        >
          <div className="flex flex-col gap-0.5 rounded-control border bg-surface px-2.5 py-2">
            <span className="flex items-center gap-1.5 text-small" style={{ fontWeight: 500 }}>
              <span className="size-1.5 rounded-full bg-score-hot" aria-hidden="true" />
              Formcraft
            </span>
            <span className="text-mono text-fg-muted">Last scan 2h ago</span>
          </div>
          {MOCK_RAIL.map((group) => (
            <div key={group.label} className="flex flex-col gap-0.5">
              <span className="px-2 pb-1 text-[11px] uppercase tracking-wide text-fg-muted">
                {group.label}
              </span>
              {group.items.map((item) => (
                <span
                  key={item.name}
                  className={
                    item.name === active
                      ? "flex items-center justify-between rounded-control bg-surface-2 px-2 py-1.5 text-small text-fg"
                      : "flex items-center justify-between rounded-control px-2 py-1.5 text-small text-fg-muted"
                  }
                >
                  {item.name}
                  {item.count === undefined ? null : (
                    <span className="rounded-control bg-surface-2 px-1.5 text-mono tabular-nums text-fg-muted">
                      {item.count}
                    </span>
                  )}
                </span>
              ))}
            </div>
          ))}
        </aside>
        <div className="min-w-0 flex-1">
          <div className="flex h-12 items-center justify-between border-b px-4">
            <span className="text-small" style={{ fontWeight: 500 }}>
              {title}
            </span>
            <div className="flex items-center gap-2">{actions}</div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
