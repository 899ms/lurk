import Link from "next/link";
import { eq } from "drizzle-orm";
import { EmptyState } from "@/components/EmptyState";
import { EvidenceThreads } from "@/components/product/EvidenceThreads";
import { ListEditor } from "@/components/product/ListEditor";
import { PlanEditor } from "@/components/product/PlanEditor";
import { ProfileForm } from "@/components/product/ProfileForm";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import {
  projectCompetitors,
  projectKeywords,
  projectSubreddits,
  subreddits as subredditRows,
} from "@/db/schema";
import {
  rebuildProfileAction,
  scanAndOpenLeadsAction,
} from "@/app/app/product/actions";
import { requireLocalUser } from "@/lib/auth";
import { dedupeThreads } from "@/lib/discovery/rank";
import { loadEvidence, parseDestinations, parseTextList } from "@/lib/discovery/store";
import { activeProject } from "@/lib/projects";
import { DEFAULT_SCORE_THRESHOLD } from "@/lib/scan/constants";
import { tierForUser } from "@/lib/tier";

type ProductPageProps = { searchParams: Promise<{ project?: string }> };

export default async function ProductPage({ searchParams }: ProductPageProps) {
  const user = await requireLocalUser();
  const project = await activeProject(user.id, (await searchParams).project);

  if (!project) {
    return (
      <div className="flex max-w-2xl flex-col gap-4">
        <EmptyState
          title="Product"
          sentence="Your product profile appears here once a project has been analysed."
        />
        <Button
          size="lg"
          nativeButton={false}
          className="self-start"
          render={<Link href="/app/projects/new">New project</Link>}
        />
      </div>
    );
  }

  const [keywords, subs, competitors, { limits }] = await Promise.all([
    db()
      .select()
      .from(projectKeywords)
      .where(eq(projectKeywords.projectId, project.id)),
    db()
      .select()
      .from(projectSubreddits)
      .where(eq(projectSubreddits.projectId, project.id)),
    db()
      .select()
      .from(projectCompetitors)
      .where(eq(projectCompetitors.projectId, project.id)),
    tierForUser(user.id),
  ]);
  const icons = Object.fromEntries(
    (await db().select().from(subredditRows)).map((row) => [row.name, row.iconUrl]),
  );
  const evidence = await loadEvidence(project.id);
  const threads = dedupeThreads(evidence)
    .sort((left, right) => right.weight - left.weight || left.bestPosition - right.bestPosition)
    .map((thread) => {
      const row = evidence.find((item) => item.postId === thread.postId);
      return {
        postId: thread.postId,
        canonicalUrl: row?.canonicalUrl ?? "",
        subreddit: thread.subreddit,
        title: thread.title,
        relevance: row?.relevance ?? "unlabeled",
      };
    });
  const planRow = (row: {
    source: string;
    state: string;
    evidence: number;
  }) => ({ source: row.source, state: row.state, evidence: row.evidence });

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-h2" style={{ fontWeight: 500 }}>
          Product
        </h1>
        <p className="text-body text-fg-muted">
          What we tell the scorer about your product, and where it looks. Edit
          anything that reads wrong; the next scan uses what is here.
        </p>
      </div>

      <ProfileForm
        project={{
          id: project.id,
          name: project.name,
          url: project.url ?? "",
          pain: project.pain ?? "",
          solution: project.solution ?? "",
          targetUsers: project.targetUsers ?? "",
          geography: project.geography ?? "",
          budgetFit: project.budgetFit ?? "",
          scoreThreshold: project.scoreThreshold ?? DEFAULT_SCORE_THRESHOLD,
        }}
      />

      <ListEditor
        title="Places you serve"
        hint="Read off your own page. Discovery asks Google about each of these."
        placeholder="Las Vegas"
        kind="destination"
        projectId={project.id}
        items={parseDestinations(project.destinations).map((place) => ({
          value: place.name,
          sourceText: place.sourceText,
        }))}
      />
      <ListEditor
        title="How buyers say it"
        hint="The problem in their words, which is what we search for."
        placeholder="hotels that let 19 year olds check in"
        kind="phrasing"
        projectId={project.id}
        items={parseTextList(project.problemPhrasings).map((phrase) => ({
          value: phrase,
          sourceText: null,
        }))}
      />

      <ListEditor
        title="What it can do"
        hint="Read off your own page. The scorer judges a person's need against these."
        placeholder="check in guests aged 18 and over"
        kind="capability"
        projectId={project.id}
        items={parseTextList(project.capabilities).map((phrase) => ({
          value: phrase,
          sourceText: null,
        }))}
      />
      <ListEditor
        title="What it does not cover"
        hint="What you cannot do or will not take. It keeps the wrong person out of the feed."
        placeholder="anything outside the United States"
        kind="exclusion"
        projectId={project.id}
        items={parseTextList(project.exclusions).map((phrase) => ({
          value: phrase,
          sourceText: null,
        }))}
      />

      <PlanEditor
        title="Searches"
        hint="What we search Reddit for. Google evidence wrote these; pin one to keep it."
        placeholder="cold email deliverability"
        kind="keyword"
        projectId={project.id}
        rows={keywords.map((row) => ({ value: row.keyword, ...planRow(row) }))}
        limit={limits?.keywordsPerProject ?? null}
      />
      <PlanEditor
        title="Communities"
        hint="Where relevant threads were actually found. Waiting ones are next in line."
        placeholder="r/saas"
        kind="subreddit"
        projectId={project.id}
        rows={subs.map((row) => ({ value: row.name, ...planRow(row) }))}
        limit={limits?.subredditsPerProject ?? null}
        icons={icons}
      />
      <PlanEditor
        title="Competitors"
        hint="Named in the evidence as doing the same job for the same person."
        placeholder="Acme"
        kind="competitor"
        projectId={project.id}
        rows={competitors.map((row) => ({ value: row.name, ...planRow(row) }))}
        limit={limits?.competitors ?? null}
      />

      <EvidenceThreads threads={threads} />

      <div className="flex flex-wrap items-center gap-3">
        <form action={scanAndOpenLeadsAction}>
          <input type="hidden" name="projectId" value={project.id} />
          <Button type="submit" size="lg">
            Scan now
          </Button>
        </form>
        <form action={rebuildProfileAction}>
          <input type="hidden" name="projectId" value={project.id} />
          <Button type="submit" variant="secondary" size="lg">
            Rebuild profile
          </Button>
        </form>
        <span className="text-small text-fg-muted">
          Rebuilding reads your site again and replaces everything above.
        </span>
      </div>
    </div>
  );
}
