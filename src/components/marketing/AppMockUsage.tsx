import { MockButton } from "./MockButton";
import { MockFrame } from "./MockFrame";
import { MOCK_USAGE_ROWS } from "./mockContent";

const HEAD = ["API", "Calls", "Answered from data already fetched", "Cost"];

/** The Data usage panel: what the week actually cost, per API. */
export function AppMockUsage() {
  return (
    <MockFrame
      active="Data usage"
      title="Data usage"
      actions={
        <>
          <MockButton label="This week" />
          <MockButton label="Export" tone="solid" />
        </>
      }
    >
      <div className="flex flex-col gap-4 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Spent this week", value: "$0.31" },
            { label: "Calls", value: "412" },
            { label: "Answered from data already fetched", value: "38%" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-card bg-surface-2 p-3">
              <span className="block text-mono text-fg-muted">{stat.label}</span>
              <span className="block pt-2 text-h3 tabular-nums" style={{ fontWeight: 500 }}>
                {stat.value}
              </span>
            </div>
          ))}
        </div>
        <div>
          <div className="grid grid-cols-[minmax(0,3fr)_auto_auto_auto] items-center gap-x-4 border-b pb-2 text-mono text-fg-muted">
            {HEAD.map((head, index) => (
              <span key={head} className={index === 0 ? undefined : "text-right"}>
                {head}
              </span>
            ))}
          </div>
          {MOCK_USAGE_ROWS.map((row) => (
            <div
              key={row.api}
              className="grid grid-cols-[minmax(0,3fr)_auto_auto_auto] items-center gap-x-4 border-b py-2.5"
            >
              <span className="font-mono text-mono text-fg">{row.api}</span>
              <span className="text-right text-small tabular-nums text-fg-muted">{row.calls}</span>
              <span className="text-right text-small tabular-nums text-fg-muted">{row.reused}</span>
              <span className="text-right font-mono text-mono text-fg">{row.cost}</span>
            </div>
          ))}
        </div>
        <p className="text-mono text-fg-muted">
          Every line is one AnyAPI call at the catalog price, with its request id. Nothing is
          marked up and there is no subscription.
        </p>
      </div>
    </MockFrame>
  );
}
