import { scanCompetitorsAction } from "@/app/app/competitors/actions";
import { CompetitorChip } from "@/components/competitors/CompetitorChip";
import { MentionCard } from "@/components/competitors/MentionCard";
import { MentionsBar } from "@/components/competitors/MentionsBar";
import { EmptyState } from "@/components/EmptyState";
import { relativeAge } from "@/components/leads/ScanStatus";
import { Button } from "@/components/ui/button";
import { lastRunJob } from "@/jobs/enqueue";
import { requireLocalUser } from "@/lib/auth";
import { listCompetitorNames, listMentions, mentionSeries } from "@/lib/competitors/read";
import { leadCosts } from "@/lib/leads";
import { activeProject } from "@/lib/projects";

type CompetitorsPageProps = { searchParams: Promise<{ project?: string }> };

function lastRunSentence(job: Awaited<ReturnType<typeof lastRunJob>>): string {
  if (!job) {
    return "No competitor scan has run yet. Press Scan now to see this week's posts.";
  }
  if (!job.finishedAt) {
    return job.progress ? `Scanning now: ${job.progress}` : "A competitor scan is queued.";
  }
  if (job.error) {
    return `Last scan stopped: ${job.error.split("\n")[0]}`;
  }
  return `Last scanned ${relativeAge(job.finishedAt)}.`;
}

export default async function CompetitorsPage({ searchParams }: CompetitorsPageProps) {
  const user = await requireLocalUser();
  const params = await searchParams;
  const project = await activeProject(user.id, params.project);
  if (!project) {
    return (
      <EmptyState
        title="Competitors"
        sentence="Create a project first, then we can watch what Reddit says about the products you compete with."
      />
    );
  }

  const [names, mentions, job] = await Promise.all([
    listCompetitorNames(project.id),
    listMentions(project.id),
    lastRunJob("competitor_scan", project.id),
  ]);
  const costs = await leadCosts(
    project.id,
    mentions.map((mention) => mention.postId),
  );
  const counts = new Map<string, number>();
  for (const mention of mentions) {
    counts.set(mention.competitor, (counts.get(mention.competitor) ?? 0) + 1);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-h2" style={{ fontWeight: 500 }}>
            Competitors
          </h1>
          <p className="text-small text-fg-muted">{lastRunSentence(job)}</p>
        </div>
        <form action={scanCompetitorsAction.bind(null, project.id)}>
          <Button type="submit" size="lg">
            Scan now
          </Button>
        </form>
      </div>

      {names.length === 0 ? (
        <EmptyState
          title="No competitors yet"
          sentence="Add the products you compete with on the Product screen, then scan for what Reddit says about them."
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {names.map((name) => (
              <CompetitorChip key={name} name={name} count={counts.get(name) ?? 0} />
            ))}
          </div>
          <MentionsBar series={mentionSeries(mentions, names)} />
          {mentions.length === 0 ? (
            <EmptyState
              title="No mentions yet"
              sentence="Nothing on Reddit named these products in the last 30 days, or no scan has run."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {mentions.map((mention) => (
                <MentionCard
                  key={mention.id}
                  mention={mention}
                  cost={costs.get(mention.postId) ?? null}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
