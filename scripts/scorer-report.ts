/**
 * Prints the scorer report. Every number comes from `scorerReport`, which the
 * settings page reads too, so the two surfaces cannot disagree.
 *
 *   npm run scorer:report -- --project <id> --days 7
 */
import { existsSync } from "node:fs";

/** The database url lives in .env, which a plain node process does not read. */
if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const { scorerReport } = await import("../src/lib/scorerReport");
type ScorerReport = Awaited<ReturnType<typeof scorerReport>>;

/** The flags, in the plainest form: `--name value`. */
function flag(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? undefined : process.argv[at + 1];
}

function pad(value: string | number, width: number): string {
  return String(value).padEnd(width);
}

function money(value: number): string {
  return `$${value.toFixed(4)}`;
}

function ms(value: number | null): string {
  return value === null ? "-" : `${(value / 1000).toFixed(1)}s`;
}

function print(report: ScorerReport): void {
  const where = report.scope.projectIds.length === 0 ? "every project" : report.scope.projectIds.join(", ");
  console.log(`Scorer report for ${where}, since ${report.since.toISOString()}\n`);

  console.log("VERDICTS BY SCORER VERSION");
  console.log(`  ${pad("version", 16)}${pad("qualify", 9)}${pad("review", 8)}${pad("reject", 8)}${pad("buyer", 7)}context`);
  for (const row of report.versions) {
    console.log(
      `  ${pad(row.scorerVersion, 16)}${pad(row.qualify, 9)}${pad(row.review, 8)}${pad(row.reject, 8)}${pad(row.buyerLeads, 7)}${row.contextLeads}`,
    );
  }
  if (report.versions.length === 0) {
    console.log("  nothing judged in this window");
  }

  console.log("\nWHAT PEOPLE DID WITH THE LEADS");
  console.log(`  ${pad("version", 16)}${pad("status", 12)}${pad("reason", 16)}${pad("leads", 7)}share of acted`);
  for (const row of report.feedback) {
    console.log(
      `  ${pad(row.scorerVersion, 16)}${pad(row.status, 12)}${pad(row.notFitReason ?? "-", 16)}${pad(row.leads, 7)}${row.status === "new" ? "-" : `${row.shareOfActed.toFixed(1)}%`}`,
    );
  }
  if (report.feedback.length === 0) {
    console.log("  no leads in this window");
  }

  console.log("\nMODEL CALLS");
  console.log(
    `  ${pad("purpose", 18)}${pad("model", 34)}${pad("provider", 14)}${pad("calls", 7)}${pad("p50", 8)}${pad("p95", 8)}${pad("cost", 10)}${pad("per lead", 10)}${pad("dropped", 9)}${pad("schema", 8)}retries`,
  );
  for (const row of report.calls) {
    console.log(
      `  ${pad(row.purpose, 18)}${pad(row.model ?? "-", 34)}${pad(row.provider ?? "-", 14)}${pad(row.calls, 7)}${pad(ms(row.p50Ms), 8)}${pad(ms(row.p95Ms), 8)}${pad(money(row.costUsd), 10)}${pad(row.costPerQualifiedLeadUsd === null ? "-" : money(row.costPerQualifiedLeadUsd), 10)}${pad(row.itemsDropped, 9)}${pad(row.schemaFailures, 8)}${row.retries}`,
    );
  }
  if (report.calls.length === 0) {
    console.log("  no model call in this window");
  }

  console.log("\nJOBS");
  console.log(`  ${pad("kind", 12)}${pad("runs", 7)}${pad("failed", 8)}mean wall`);
  for (const row of report.jobs) {
    console.log(`  ${pad(row.kind, 12)}${pad(row.runs, 7)}${pad(row.failures, 8)}${ms(row.meanWallMs)}`);
  }
  if (report.jobs.length === 0) {
    console.log("  no scan, backfill or rescore finished in this window");
  }
}

async function main() {
  const project = flag("project");
  const days = Number(flag("days") ?? 7);
  if (!Number.isFinite(days) || days <= 0) {
    throw new Error("--days takes a positive number of days");
  }
  print(await scorerReport({ projectIds: project ? [project] : [], days }));
  process.exit(0);
}

void main();
