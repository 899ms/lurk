import { StatCard } from "@/components/StatCard";
import { requireLocalUser } from "@/lib/auth";
import { listProjects } from "@/lib/projects";
import { usageToday } from "@/lib/usage";

type UsagePageProps = { searchParams: Promise<{ project?: string }> };

export default async function UsagePage({ searchParams }: UsagePageProps) {
  const user = await requireLocalUser();
  const projects = await listProjects(user.id);
  const requested = (await searchParams).project;
  const active = projects.find((project) => project.id === requested) ?? projects[0];
  const usage = await usageToday(active ? [active.id] : []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-h2" style={{ fontWeight: 500 }}>
          Data usage
        </h1>
        <p className="text-body text-fg-muted">
          What this project spent on AnyAPI today, and how much of it was answered from data we had
          already fetched.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Calls today" value={String(usage.calls)} />
        <StatCard label="USD today" value={`$${usage.costUsd.toFixed(4)}`} />
        <StatCard label="Fetched" value={String(usage.fetched)} caption="Paid AnyAPI calls" />
        <StatCard label="Reused" value={String(usage.reused)} caption="Answered from stored data" />
      </div>
      <div className="rounded-card border bg-surface">
        <table className="w-full text-body">
          <thead>
            <tr className="border-b text-left text-small text-fg-muted">
              <th className="p-4" style={{ fontWeight: 400 }}>
                API
              </th>
              <th className="p-4" style={{ fontWeight: 400 }}>
                Calls
              </th>
              <th className="p-4" style={{ fontWeight: 400 }}>
                Reused
              </th>
              <th className="p-4" style={{ fontWeight: 400 }}>
                USD
              </th>
            </tr>
          </thead>
          <tbody>
            {usage.perSku.length === 0 ? (
              <tr>
                <td className="p-4 text-fg-muted" colSpan={4}>
                  No AnyAPI calls yet today.
                </td>
              </tr>
            ) : (
              usage.perSku.map((row) => (
                <tr key={row.sku} className="border-b last:border-0">
                  <td className="p-4 font-mono text-mono">{row.sku}</td>
                  <td className="p-4 tabular-nums">{row.calls}</td>
                  <td className="p-4 tabular-nums">{row.reused}</td>
                  <td className="p-4 font-mono text-mono">${row.costUsd.toFixed(4)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
