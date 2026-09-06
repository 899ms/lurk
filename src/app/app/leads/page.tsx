import { EmptyState } from "@/components/EmptyState";
import { FeedFilters } from "@/components/leads/FeedFilters";
import { LeadCard, type CardLead } from "@/components/leads/LeadCard";
import { LeadTimeline } from "@/components/leads/LeadTimeline";
import { ScanStatus } from "@/components/leads/ScanStatus";
import { Button } from "@/components/ui/button";
import { scanNowAction } from "@/app/app/scan";
import { lastRunJob } from "@/jobs/enqueue";
import { requireLocalUser } from "@/lib/auth";
import { FEED_WINDOWS, type FeedWindow, type LeadStatus } from "@/lib/feed";
import { feedFacets, leadCosts, listLeads } from "@/lib/leads";
import { activeProject } from "@/lib/projects";

type LeadsPageProps = {
  searchParams: Promise<{
    project?: string;
    status?: string;
    days?: string;
    subreddit?: string;
    stage?: string;
  }>;
};

const STATUSES: LeadStatus[] = ["new", "hidden", "not_fit"];

const EMPTY_SENTENCE: Record<LeadStatus, string> = {
  new: "Nothing new in this window. The next scan runs on your schedule, or press Scan now.",
  hidden: "You have not hidden any leads yet.",
  not_fit: "You have not marked any leads as a miss yet.",
};

function toCard(lead: Awaited<ReturnType<typeof listLeads>>[number]): CardLead {
  const isComment = lead.commentId !== null;
  return {
    id: lead.id,
    score: lead.score,
    fit: lead.fit,
    intent: lead.intent,
    engagement: lead.engagement,
    stage: lead.stage,
    reason: lead.reason,
    matchedPhrase: lead.matchedPhrase,
    title: lead.title,
    url: lead.url,
    subreddit: lead.subreddit,
    subredditIconUrl: lead.subredditIconUrl,
    promoPolicy: lead.promoPolicy,
    rulesText: lead.rulesText,
    imageUrl: isComment ? null : lead.imageUrl,
    numComments: lead.numComments,
    points: isComment ? lead.commentScore : lead.postScore,
    createdAt: (isComment ? lead.commentCreatedAt : lead.createdAt) ?? lead.createdAt,
    body: (isComment ? lead.commentBody : lead.body) ?? "",
    author: isComment ? lead.commentAuthor : lead.postAuthor,
    avatarUrl: lead.authorAvatar,
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
  const days = (FEED_WINDOWS.find((one) => String(one) === params.days) ?? 30) as FeedWindow;
  const [rows, facets, job] = await Promise.all([
    listLeads(project.id, { status, days, subreddit: params.subreddit, stage: params.stage }),
    feedFacets(project.id),
    lastRunJob("scan", project.id),
  ]);
  const costs = await leadCosts(
    project.id,
    rows.map((row) => row.postId).filter((id): id is string => id !== null),
  );
  const cards = rows.map(toCard);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-h2" style={{ fontWeight: 500 }}>
            {project.name}
          </h2>
          <ScanStatus job={job} />
        </div>
        <form action={scanNowAction.bind(null, project.id)}>
          <Button type="submit" size="lg">
            Scan now
          </Button>
        </form>
      </div>
      <FeedFilters facets={facets} />
      <LeadTimeline
        leads={cards.map((card) => ({
          id: card.id,
          author: card.author,
          avatarUrl: card.avatarUrl,
          subreddit: card.subreddit,
          title: card.title,
          createdAt: card.createdAt,
        }))}
      />
      {cards.length === 0 ? (
        <EmptyState title="Nothing here" sentence={EMPTY_SENTENCE[status]} />
      ) : (
        <div className="flex flex-col gap-3">
          {cards.map((card, index) => (
            <LeadCard
              key={card.id}
              lead={card}
              projectId={project.id}
              cost={costs.get(rows[index].postId ?? "") ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
