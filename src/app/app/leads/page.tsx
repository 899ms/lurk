import Link from "next/link";
import { ActivityPoll } from "@/components/ActivityPoll";
import { EmptyState } from "@/components/EmptyState";
import { FeedFilters } from "@/components/leads/FeedFilters";
import { HeldSection } from "@/components/leads/HeldSection";
import { LeadDetail } from "@/components/leads/LeadDetail";
import { LeadRow } from "@/components/leads/LeadRow";
import { PeopleStrip } from "@/components/leads/PeopleStrip";
import { ScanStatus } from "@/components/leads/ScanStatus";
import { ScoreBadge } from "@/components/ScoreBadge";
import { buildStream, type CardLead } from "@/components/leads/stream";
import { entryHref, selectEntry } from "@/components/leads/workspace";
import { Button } from "@/components/ui/button";
import { scanNowAction } from "@/app/app/scan";
import { requireLocalUser } from "@/lib/auth";
import { FEED_WINDOWS, type FeedWindow, type LeadStatus } from "@/lib/feed";
import { feedFacets, listLeads, listReviewItems } from "@/lib/leads";
import { activeProject } from "@/lib/projects";
import { isBusy, projectActivity } from "@/lib/projectActivity";
import { scanReport, verdictSentence } from "@/lib/scan/report";

type LeadsPageProps = {
  searchParams: Promise<{
    project?: string;
    status?: string;
    days?: string;
    subreddit?: string;
    stage?: string;
    theme?: string;
    lead?: string;
  }>;
};

const STATUSES: LeadStatus[] = ["new", "hidden", "not_fit", "resolved"];

const EMPTY_SENTENCE: Record<LeadStatus, string> = {
  new: "Nothing new in this window. The next scan runs on your schedule, or press Scan now.",
  hidden: "You have not hidden any leads yet.",
  not_fit: "You have not marked any leads as a miss yet.",
  resolved: "No lead has said in its thread that the need is already met.",
};

/**
 * Both panes fill the window under the pinned header, inside the page gutter,
 * so the list scrolls against a post that stays put. Every term is a token.
 */
const PANE_HEIGHT = "calc(100dvh - var(--header-height) - var(--page-gutter) * 2)";
const PANE_TOP = "calc(var(--header-height) + var(--page-gutter))";

/** The same page over the whole of time, keeping every other filter pill. */
function allTimeHref(params: Record<string, string | undefined>): string {
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) {
    if (value) {
      query.set(name, value);
    }
  }
  query.set("days", "all");
  return `?${query.toString()}`;
}

function toCard(lead: Awaited<ReturnType<typeof listLeads>>[number]): CardLead {
  const isComment = lead.commentId !== null;
  return {
    id: lead.id,
    score: lead.score,
    fit: lead.fit,
    intent: lead.intent,
    engagement: lead.engagement,
    stage: lead.stage,
    kind: lead.kind,
    reason: lead.reason,
    matchedPhrase: lead.matchedPhrase,
    title: lead.title,
    url: (isComment ? lead.commentPermalink : lead.url) ?? lead.url,
    subreddit: lead.subreddit,
    subredditIconUrl: lead.subredditIconUrl,
    subredditWeeklyActive: lead.subredditWeeklyActive,
    promoPolicy: lead.promoPolicy,
    rulesText: lead.rulesText,
    imageUrl: isComment ? null : lead.imageUrl,
    numComments: lead.numComments,
    points: isComment ? lead.commentScore : lead.postScore,
    createdAt: (isComment ? lead.commentCreatedAt : lead.createdAt) ?? lead.createdAt,
    body: (isComment ? lead.commentBody : lead.body) ?? "",
    author: isComment ? lead.commentAuthor : lead.postAuthor,
    avatarUrl: lead.authorAvatar,
    authorKarma: lead.authorKarma,
    authorCreatedAt: lead.authorCreatedAt,
    isComment,
    postAuthor: lead.postAuthor,
    postAuthorAvatar: lead.postAuthorAvatar,
  };
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const user = await requireLocalUser();
  const params = await searchParams;
  const project = await activeProject(user.id, params.project);
  if (!project) {
    return (
      <EmptyState
        title="Leads"
        sentence="Create a project first, then scans can look for people asking about what you sell."
      />
    );
  }

  const status = STATUSES.find((one) => one === params.status) ?? "new";
  const days: FeedWindow = FEED_WINDOWS.find((one) => String(one) === params.days) ?? 30;
  const [rows, facets, activity, review, report] = await Promise.all([
    listLeads(project.id, {
      status,
      days,
      subreddit: params.subreddit,
      stage: params.stage,
      theme: params.theme,
    }),
    feedFacets(project.id),
    projectActivity(project.id),
    listReviewItems(project.id, days),
    scanReport(project.id, days),
  ]);
  const entries = buildStream(rows.map(toCard));
  const held = status === "new" ? review : [];
  const selection = selectEntry(entries, held, params.lead);
  const selectedId =
    selection === null ? null : selection.kind === "lead" ? selection.entry.id : params.lead ?? null;
  // One sentence, in one of two places: over the list when it has leads to
  // count, and inside it when it is empty and has to say why.
  const sentence = verdictSentence(report, entries.length);
  /**
   * A window that holds nothing is not the same as a project that holds
   * nothing: the first sweep reaches back a year, so the leads it found are
   * usually outside the window the feed opens on. Counted only when there is
   * an empty feed to explain.
   */
  const elsewhere =
    entries.length === 0 && status === "new" && days !== "all"
      ? buildStream(
          (await listLeads(project.id, {
            status,
            days: "all",
            subreddit: params.subreddit,
            stage: params.stage,
            theme: params.theme,
          })).map(toCard),
        ).length
      : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-h2" style={{ fontWeight: 500 }}>
            {project.name}
          </h2>
          <div className="flex flex-wrap items-baseline gap-x-1.5">
            {entries.length > 0 ? <p className="text-small text-fg-muted">{sentence}</p> : null}
            <ScanStatus activity={activity} />
          </div>
        </div>
        <form action={scanNowAction.bind(null, project.id)}>
          <Button type="submit" size="lg">
            Scan now
          </Button>
        </form>
      </div>

      <ActivityPoll busy={isBusy(activity)} />
      <PeopleStrip entries={entries} />
      <FeedFilters facets={facets} />

      <div className="grid items-start gap-4 md:grid-cols-[minmax(0,7fr)_minmax(0,9fr)]">
        <div
          className="sticky flex flex-col overflow-y-auto rounded-card border bg-surface"
          style={{ top: PANE_TOP, maxHeight: PANE_HEIGHT }}
        >
          <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-surface px-3 py-2">
            <span className="text-mono tracking-wide text-fg-muted uppercase">Leads</span>
            <span className="text-mono tabular-nums text-fg-muted">{entries.length}</span>
          </div>
          {entries.length === 0 ? (
            <p className="text-small p-3 text-fg-muted">
              {status !== "new" ? (
                EMPTY_SENTENCE[status]
              ) : elsewhere > 0 ? (
                <>
                  Nothing in this window.{" "}
                  <Link className="underline" href={allTimeHref(params)}>
                    {elsewhere} {elsewhere === 1 ? "lead" : "leads"} in all time
                  </Link>
                  .
                </>
              ) : (
                sentence
              )}
            </p>
          ) : (
            entries.map((entry) => (
              <LeadRow
                key={entry.id}
                href={entryHref(params, entry.id)}
                selected={entry.id === selectedId}
                title={entry.lead.title}
                author={entry.lead.author}
                avatarUrl={entry.lead.avatarUrl}
                subreddit={entry.lead.subreddit}
                subredditIconUrl={entry.lead.subredditIconUrl}
                createdAt={entry.lead.createdAt}
                trailing={<ScoreBadge score={entry.lead.score} />}
              />
            ))
          )}
          {held.length > 0 ? (
            <HeldSection items={held} params={params} selectedId={selectedId} />
          ) : null}
        </div>

        {selection ? (
          <div
            className="sticky flex flex-col overflow-hidden rounded-card border bg-surface"
            style={{ top: PANE_TOP, maxHeight: PANE_HEIGHT }}
          >
            <LeadDetail selection={selection} projectId={project.id} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
