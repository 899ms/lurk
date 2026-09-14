import { ReportTable } from "@/components/scorer/ReportTable";
import { requireLocalUser } from "@/lib/auth";
import { listProjects } from "@/lib/projects";
import { scorerReport } from "@/lib/scorerReport";

/**
 * How much longer than a week a person would have to look back before the
 * report was about a scorer nobody runs any more. Seven days is what the
 * command line defaults to, so both surfaces answer the same question.
 */
const WINDOW_DAYS = 7;

function money(value: number): string {
  return `$${value.toFixed(4)}`;
}

function seconds(value: number | null): string {
  return value === null ? "-" : `${(value / 1000).toFixed(1)}s`;
}

/**
 * What the scorer did for this person's projects in the last week: what it
 * decided, what they did with it, what each model call cost and answered, and
 * whether the jobs behind it finished. Every figure is read from a table by
 * lib/scorerReport.ts; this page formats and nothing else.
 */
export default async function ScoringSettingsPage() {
  const user = await requireLocalUser();
  const projects = await listProjects(user.id);
  const report = await scorerReport({
    projectIds: projects.map((project) => project.id),
    days: WINDOW_DAYS,
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-h2" style={{ fontWeight: 500 }}>
          Scoring
        </h1>
        <p className="text-body text-fg-muted">
          What the scorer decided across your projects in the last {WINDOW_DAYS} days, what you did
          with it, and what it cost. Nothing here is estimated: every figure is counted from what
          the scan stored.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-h3" style={{ fontWeight: 500 }}>
          Verdicts, by scorer version
        </h2>
        <ReportTable
          columns={["Version", "Qualified", "Held", "Rejected", "Buyer leads", "Context leads"]}
          rows={report.versions.map((row) => [
            row.scorerVersion,
            row.qualify,
            row.review,
            row.reject,
            row.buyerLeads,
            row.contextLeads,
          ])}
          empty="No scan has judged anything in this window."
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h3" style={{ fontWeight: 500 }}>
          What you did with the leads
        </h2>
        <ReportTable
          columns={["Version", "Status", "Reason", "Leads", "Share of the ones you acted on"]}
          rows={report.feedback.map((row) => [
            row.scorerVersion,
            row.status,
            row.notFitReason ?? "-",
            row.leads,
            row.status === "new" ? "-" : `${row.shareOfActed.toFixed(1)}%`,
          ])}
          empty="No leads in this window, so there is nothing you could have acted on."
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h3" style={{ fontWeight: 500 }}>
          Model calls
        </h2>
        <ReportTable
          columns={[
            "Purpose",
            "Model",
            "Provider",
            "Calls",
            "p50",
            "p95",
            "Cost",
            "Per qualified lead",
            "Items dropped",
            "Schema failures",
            "Retries",
          ]}
          rows={report.calls.map((row) => [
            row.purpose,
            row.model ?? "-",
            row.provider ?? "-",
            row.calls,
            seconds(row.p50Ms),
            seconds(row.p95Ms),
            money(row.costUsd),
            row.costPerQualifiedLeadUsd === null ? "-" : money(row.costPerQualifiedLeadUsd),
            row.itemsDropped,
            row.schemaFailures,
            row.retries,
          ])}
          empty="No model call in this window."
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h3" style={{ fontWeight: 500 }}>
          Jobs
        </h2>
        <ReportTable
          columns={["Kind", "Runs", "Failed", "Mean wall"]}
          rows={report.jobs.map((row) => [
            row.kind,
            row.runs,
            row.failures,
            seconds(row.meanWallMs),
          ])}
          empty="No scan, first sweep or rescore finished in this window."
        />
      </section>
    </div>
  );
}
