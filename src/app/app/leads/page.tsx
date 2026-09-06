import { EmptyState } from "@/components/EmptyState";
import { LeadDetail } from "@/components/leads/LeadDetail";
import { LeadRow } from "@/components/leads/LeadRow";
import { LeadsPane } from "@/components/leads/LeadsPane";
import { ScanStatus } from "@/components/leads/ScanStatus";
import { Button } from "@/components/ui/button";
import { scanNowAction } from "@/app/app/scan";
import { lastRunJob } from "@/jobs/enqueue";
import { requireLocalUser } from "@/lib/auth";
import { listLeads, type LeadStatus } from "@/lib/leads";
import { activeProject } from "@/lib/projects";

type LeadsPageProps = {
  searchParams: Promise<{ project?: string; status?: string; lead?: string }>;
};

const STATUSES: LeadStatus[] = ["new", "hidden", "not_fit"];

const EMPTY_SENTENCE: Record<LeadStatus, string> = {
  new: "Nothing new since the last scan. The next one runs on your schedule, or press Scan now.",
  hidden: "You have not hidden any leads yet.",
  not_fit: "You have not marked any leads as a miss yet.",
};

function hrefFor(projectId: string, status: LeadStatus, leadId?: string): string {
  const params = new URLSearchParams({ project: projectId, status });
  if (leadId) {
    params.set("lead", leadId);
  }
  return `/app/leads?${params.toString()}`;
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const user = await requireLocalUser();
  const params = await searchParams;
  const project = await activeProject(user.id, params.project);
  if (!project) {
    return (
      <EmptyState
        title="Leads"
        sentence="Create a project in the sidebar first, then scans can look for people asking about what you sell."
      />
    );
  }

  const status = STATUSES.find((one) => one === params.status) ?? "new";
  const [feed, job] = await Promise.all([
    listLeads(project.id, status),
    lastRunJob("scan", project.id),
  ]);
  const selected = feed.find((lead) => lead.id === params.lead) ?? feed[0] ?? null;

  return (
    <div className="flex flex-col gap-6">
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
      <div className="grid overflow-hidden rounded-card border bg-surface lg:grid-cols-[380px_minmax(0,1fr)]">
        <LeadsPane status={status}>
          {feed.map((lead) => (
            <LeadRow
              key={lead.id}
              lead={lead}
              href={hrefFor(project.id, status, lead.id)}
              selected={selected?.id === lead.id}
            />
          ))}
        </LeadsPane>
        {selected ? (
          <LeadDetail lead={selected} projectId={project.id} />
        ) : (
          <div className="p-5">
            <EmptyState title="Nothing here" sentence={EMPTY_SENTENCE[status]} />
          </div>
        )}
      </div>
    </div>
  );
}
