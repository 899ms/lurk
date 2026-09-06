import Link from "next/link";
import { AddChannelForm } from "@/components/alerts/AddChannelForm";
import { AlertChannelList, type ChannelRow } from "@/components/alerts/AlertChannelList";
import { EmptyState } from "@/components/EmptyState";
import { listChannels } from "@/lib/alerts/channels";
import { webhookAllowance, webhookCapText } from "@/lib/alerts/select";
import { requireLocalUser } from "@/lib/auth";
import { activeProject } from "@/lib/projects";
import { tierForUser } from "@/lib/tier";

type AlertsPageProps = { searchParams: Promise<{ project?: string }> };

export default async function AlertsPage({ searchParams }: AlertsPageProps) {
  const user = await requireLocalUser();
  const { project: requested } = await searchParams;
  const project = await activeProject(user.id, requested);
  if (!project) {
    return (
      <EmptyState
        title="Alerts"
        sentence="Create a project first, then pick where its new leads should land."
      />
    );
  }
  const { limits } = await tierForUser(user.id);
  const channels = await listChannels(project.id);
  const kinds = channels.map((one) => one.channel);
  const allowance = webhookAllowance(kinds, limits);
  const rows: ChannelRow[] = channels.map((one) => ({
    id: one.id,
    channel: one.channel,
    target: one.target,
    cadence: one.cadence,
    lastSentAt: one.lastSentAt ? one.lastSentAt.toISOString().slice(0, 16).replace("T", " ") : null,
  }));

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-h2" style={{ fontWeight: 500 }}>
          Alerts
        </h1>
        <p className="text-body text-fg-muted">
          Where new leads for {project.name} go. Email carries the whole digest; Slack, Discord and
          a plain webhook carry the top five.{" "}
          <Link href="/app/settings" className="underline">
            Back to settings
          </Link>
        </p>
      </div>
      <div className="flex items-center gap-3">
        <h2 className="text-h3" style={{ fontWeight: 500 }}>
          Channels
        </h2>
        {webhookCapText(kinds, limits) ? (
          <span className="rounded-control bg-surface-2 px-2 py-0.5 text-small text-fg-muted">
            {webhookCapText(kinds, limits)}
          </span>
        ) : null}
      </div>
      <AlertChannelList projectId={project.id} channels={rows} />
      <AddChannelForm
        projectId={project.id}
        webhooksAtCap={allowance.atCap}
        hourlyAllowed={limits?.alertCadence !== "daily"}
      />
    </div>
  );
}
