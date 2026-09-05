import { CostLine } from "@/components/CostLine";
import { ScoreBadge } from "@/components/ScoreBadge";
import { SubredditChip } from "@/components/SubredditChip";
import { MockButton } from "./MockButton";
import { MockFrame } from "./MockFrame";
import { MOCK_DETAIL, MOCK_DRAFT, MOCK_LEADS } from "./mockContent";

/** The lead feed: ranked list on the left, the selected thread on the right. */
export function AppMockLeads() {
  return (
    <MockFrame
      active="Leads"
      title="Leads"
      actions={
        <>
          <MockButton label="Sort: score" />
          <MockButton label="Scan now" tone="solid" />
        </>
      }
    >
      <div className="grid lg:grid-cols-[minmax(0,4fr)_minmax(0,5fr)]">
        <div className="border-b lg:border-b-0 lg:border-r">
          {MOCK_LEADS.map((lead, index) => (
            <div
              key={lead.title}
              className={
                index === 0
                  ? "flex items-start gap-2.5 border-b bg-surface-2 px-4 py-2.5"
                  : "flex items-start gap-2.5 border-b px-4 py-2.5"
              }
            >
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[10px] text-fg-muted">
                {lead.initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-small text-fg">{lead.title}</span>
                <SubredditChip name={lead.subreddit} />
              </span>
              <span className="flex shrink-0 items-center gap-2 pt-0.5">
                <ScoreBadge score={lead.score} />
                <span className="text-mono tabular-nums text-fg-muted">{lead.age}</span>
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-body text-fg" style={{ fontWeight: 500 }}>
              {MOCK_DETAIL.title}
            </h3>
            <ScoreBadge score={MOCK_LEADS[0].score} />
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <SubredditChip name={MOCK_DETAIL.subreddit} />
            <span className="rounded-control border px-1.5 py-0.5 text-mono text-fg-muted">
              {MOCK_DETAIL.promoRule}
            </span>
            <span className="text-mono text-fg-muted">{MOCK_DETAIL.author}</span>
            <span className="text-mono text-fg-muted">{MOCK_DETAIL.age}</span>
          </div>
          <p className="rounded-card bg-surface-2 p-3 text-small text-fg-muted">
            <span className="text-fg" style={{ fontWeight: 500 }}>
              {MOCK_DETAIL.stage}.{" "}
            </span>
            {MOCK_DETAIL.reason}
          </p>
          <p className="text-small text-fg-muted">
            {MOCK_DETAIL.bodyBefore}
            <mark className="rounded-sm bg-score-warm/30 px-0.5 text-fg">
              {MOCK_DETAIL.matchedPhrase}
            </mark>
            {MOCK_DETAIL.bodyAfter}
          </p>
          <div className="flex flex-col gap-2 rounded-card border p-3">
            <div className="flex items-center justify-between">
              <span className="text-mono text-fg-muted">Draft reply, your voice</span>
              <MockButton label="Copy" />
            </div>
            <p className="text-small text-fg">{MOCK_DRAFT}</p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2.5">
            <CostLine
              costUsd={MOCK_DETAIL.costUsd}
              sku={MOCK_DETAIL.sku}
              requestId={MOCK_DETAIL.requestId}
            />
            <span className="text-mono text-fg-muted">Comments answered from data already fetched</span>
          </div>
        </div>
      </div>
    </MockFrame>
  );
}
