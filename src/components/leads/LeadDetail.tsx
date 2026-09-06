import { eq } from "drizzle-orm";
import { CostLine } from "@/components/CostLine";
import { ScoreBadge } from "@/components/ScoreBadge";
import { SubredditChip } from "@/components/SubredditChip";
import { HighlightedBody } from "@/components/leads/HighlightedBody";
import { PromoPolicyBadge } from "@/components/leads/PromoPolicyBadge";
import { relativeAge } from "@/components/leads/ScanStatus";
import { Button } from "@/components/ui/button";
import { hideLeadAction, markNotFitAction } from "@/app/app/leads/actions";
import { db } from "@/db";
import { leads as leadsTable } from "@/db/schema";
import { leadCost, subredditPolicy, type FeedLead } from "@/lib/leads";

const NOT_FIT_REASONS = [
  "wrong audience",
  "seller side",
  "no active need",
  "wrong category",
  "other",
];

type LeadDetailProps = { lead: FeedLead; projectId: string };

/** What this lead cost, read through the post the feed row does not carry. */
async function costOfLead(projectId: string, leadId: string) {
  const rows = await db()
    .select({ postId: leadsTable.postId })
    .from(leadsTable)
    .where(eq(leadsTable.id, leadId));
  const postId = rows[0]?.postId;
  return postId ? leadCost(projectId, postId) : null;
}

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <span className="flex flex-col gap-0.5">
      <span className="text-mono text-fg-muted">{label}</span>
      <span className="text-small tabular-nums text-fg">{value ?? "-"}</span>
    </span>
  );
}

/** The selected thread: what it says, why it scored, and what it cost. */
export async function LeadDetail({ lead, projectId }: LeadDetailProps) {
  const [policy, cost] = await Promise.all([
    subredditPolicy(lead.subreddit),
    costOfLead(projectId, lead.id),
  ]);
  const isComment = lead.commentId !== null;
  const body = (isComment ? lead.commentBody : lead.body) ?? "";

  return (
    <div className="flex min-w-0 flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-4">
        <a
          href={lead.url}
          target="_blank"
          rel="noreferrer noopener"
          className="text-h3 text-fg hover:underline"
          style={{ fontWeight: 500 }}
        >
          {lead.title}
        </a>
        <ScoreBadge score={lead.score} />
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <SubredditChip name={lead.subreddit} />
        <PromoPolicyBadge
          policy={policy?.promoPolicy ?? null}
          rulesText={policy?.rulesText ?? null}
        />
        <span className="text-mono text-fg-muted">
          {(isComment ? lead.commentAuthor : lead.author) ?? "unknown author"}
        </span>
        <span className="text-mono text-fg-muted">{relativeAge(lead.createdAt)}</span>
        <span className="text-mono text-fg-muted">{lead.numComments ?? 0} comments</span>
      </div>
      {lead.reason ? (
        <p className="rounded-card bg-surface-2 p-3 text-small text-fg-muted">
          {lead.stage ? (
            <span className="text-fg" style={{ fontWeight: 500 }}>
              {lead.stage}.{" "}
            </span>
          ) : null}
          {lead.reason}
        </p>
      ) : null}
      {isComment ? (
        <p className="text-mono text-fg-muted">In reply to the thread: {lead.title}</p>
      ) : null}
      {body ? (
        <HighlightedBody text={body} phrase={lead.matchedPhrase} />
      ) : (
        <p className="text-body text-fg-muted">This one is a title only, with no body text.</p>
      )}
      <div className="flex gap-6">
        <Metric label="Fit" value={lead.fit} />
        <Metric label="Intent" value={lead.intent} />
        <Metric label="Engagement" value={lead.engagement} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
        {cost ? (
          <CostLine costUsd={cost.costUsd} sku={cost.sku} requestId={cost.requestId} />
        ) : (
          <span className="text-mono text-fg-muted">Answered from data already fetched</span>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <form action={hideLeadAction.bind(null, projectId, lead.id)}>
            <Button type="submit" variant="ghost" size="lg">
              Hide
            </Button>
          </form>
          <form
            action={markNotFitAction.bind(null, projectId, lead.id)}
            className="flex items-center gap-2"
          >
            <select
              name="reason"
              required
              defaultValue=""
              aria-label="Why this lead is not a fit"
              className="h-9 rounded-control border bg-surface px-2 text-small text-fg"
            >
              <option value="" disabled>
                Pick a reason
              </option>
              {NOT_FIT_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline" size="lg">
              Not a fit
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
