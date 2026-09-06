import { refreshSeoAction } from "@/app/app/seo/actions";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { KeywordSection } from "@/components/seo/KeywordSection";
import type { RankingThread } from "@/components/seo/OpportunityCard";
import { RefreshStatus } from "@/components/seo/RefreshStatus";
import { SeoFilters } from "@/components/seo/SeoFilters";
import { lastRunJob } from "@/jobs/enqueue";
import { requireLocalUser } from "@/lib/auth";
import { activeProject } from "@/lib/projects";
import { normalizeQuery } from "@/lib/reddit/fetch";
import { keywordCosts, listOpportunities, seoFacets, volumesFor, type SeoRow } from "@/lib/seo/read";

type SeoPageProps = {
  searchParams: Promise<{
    project?: string;
    keyword?: string;
    subreddit?: string;
    competitor?: string;
  }>;
};

const EMPTY_SENTENCE =
  "A refresh asks Google which Reddit threads rank for each of your keywords, then opens every thread for its score, replies and age. At catalog prices that is about $0.001 per keyword.";

function toThread(row: SeoRow): RankingThread {
  return {
    id: row.id,
    position: row.position,
    competitorPresent: row.competitorPresent,
    title: row.title,
    url: row.url,
    subreddit: row.subreddit,
    subredditIconUrl: row.subredditIconUrl,
    score: row.score,
    numComments: row.numComments,
    createdAt: row.createdAt,
  };
}

function byKeyword(rows: SeoRow[]): Map<string, RankingThread[]> {
  const grouped = new Map<string, RankingThread[]>();
  for (const row of rows) {
    const threads = grouped.get(row.keyword) ?? [];
    threads.push(toThread(row));
    grouped.set(row.keyword, threads);
  }
  return grouped;
}

export default async function SeoPage({ searchParams }: SeoPageProps) {
  const user = await requireLocalUser();
  const params = await searchParams;
  const project = await activeProject(user.id, params.project);
  if (!project) {
    return (
      <EmptyState
        title="Reddit SEO"
        sentence="Create a project first, then a refresh can find the Reddit threads ranking for your keywords."
      />
    );
  }

  const [rows, facets, job] = await Promise.all([
    listOpportunities(project.id, {
      keyword: params.keyword,
      subreddit: params.subreddit,
      competitor: params.competitor,
    }),
    seoFacets(project.id),
    lastRunJob("seo_refresh", project.id),
  ]);
  const grouped = byKeyword(rows);
  const keywords = [...grouped.keys()];
  const [volumes, costs] = await Promise.all([volumesFor(keywords), keywordCosts(project.id, keywords)]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-h2" style={{ fontWeight: 500 }}>
            Reddit SEO
          </h2>
          <RefreshStatus job={job} />
        </div>
        <form action={refreshSeoAction.bind(null, project.id)}>
          <Button type="submit" size="lg">
            Refresh now
          </Button>
        </form>
      </div>
      <SeoFilters facets={facets} />
      {keywords.length === 0 ? (
        <EmptyState title="Nothing ranked yet" sentence={EMPTY_SENTENCE} />
      ) : (
        <div className="flex flex-col gap-6">
          {keywords.map((keyword) => (
            <KeywordSection
              key={keyword}
              keyword={keyword}
              monthlyVolume={volumes.get(normalizeQuery(keyword)) ?? null}
              threads={grouped.get(keyword) ?? []}
              cost={costs.get(keyword) ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
