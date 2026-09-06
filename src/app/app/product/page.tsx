import Link from "next/link";
import { eq } from "drizzle-orm";
import { EmptyState } from "@/components/EmptyState";
import { ChipEditor } from "@/components/product/ChipEditor";
import { ProfileForm } from "@/components/product/ProfileForm";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import {
  projectCompetitors,
  projectKeywords,
  projectSubreddits,
} from "@/db/schema";
import {
  rebuildProfileAction,
  scanAndOpenLeadsAction,
} from "@/app/app/product/actions";
import { requireLocalUser } from "@/lib/auth";
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

      <ChipEditor
        title="Keywords"
        hint="Phrases we search Reddit for."
        placeholder="cold email deliverability"
        kind="keyword"
        projectId={project.id}
        values={keywords.map((row) => row.keyword)}
        limit={limits?.keywordsPerProject ?? null}
      />
      <ChipEditor
        title="Subreddits"
        hint="Communities we read on every scan."
        placeholder="r/saas"
        kind="subreddit"
        projectId={project.id}
        values={subs.map((row) => row.name)}
        limit={limits?.subredditsPerProject ?? null}
      />
      <ChipEditor
        title="Competitors"
        hint="Names worth catching when someone mentions them."
        placeholder="Acme"
        kind="competitor"
        projectId={project.id}
        values={competitors.map((row) => row.name)}
        limit={limits?.competitors ?? null}
      />

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
