"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { addChannelAction } from "@/app/app/settings/alerts/actions";
import { Button } from "@/components/ui/button";
import { ALERT_CHANNELS, CHANNEL_LABELS, type AlertChannel } from "@/lib/alerts/types";

type AddChannelFormProps = {
  projectId: string;
  /** Channels whose webhook allowance is already used up. */
  webhooksAtCap: boolean;
  hourlyAllowed: boolean;
};

const PLACEHOLDERS: Record<AlertChannel, string> = {
  email: "you@company.com",
  slack: "https://hooks.slack.com/services/...",
  discord: "https://discord.com/api/webhooks/...",
  webhook: "https://example.com/hooks/leads",
};

const FIELD =
  "h-10 rounded-control border bg-surface px-3 text-body text-fg";

/** Type, address and cadence for one new alert channel. */
export function AddChannelForm({ projectId, webhooksAtCap, hourlyAllowed }: AddChannelFormProps) {
  const [channel, setChannel] = useState<AlertChannel>("email");
  const [error, setError] = useState<string | null>(null);
  const blocked = webhooksAtCap && channel !== "email";

  async function submit(formData: FormData) {
    setError(null);
    try {
      await addChannelAction(projectId, formData);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : String(problem));
    }
  }

  return (
    <form action={submit} className="flex flex-col gap-3 rounded-card border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          name="channel"
          aria-label="Channel type"
          value={channel}
          onChange={(event) => setChannel(event.target.value as AlertChannel)}
          className={FIELD}
        >
          {ALERT_CHANNELS.map((one) => (
            <option key={one} value={one}>
              {CHANNEL_LABELS[one]}
            </option>
          ))}
        </select>
        <input
          name="target"
          required
          placeholder={PLACEHOLDERS[channel]}
          aria-label="Where to send it"
          className={`${FIELD} min-w-64 flex-1`}
        />
        <select name="cadence" aria-label="How often" defaultValue="daily" className={FIELD}>
          <option value="daily">Daily</option>
          <option value="hourly" disabled={!hourlyAllowed}>
            {hourlyAllowed ? "Hourly" : "Hourly (connect a wallet)"}
          </option>
        </select>
        <Button type="submit" size="lg" disabled={blocked}>
          <Plus className="size-4" aria-hidden="true" />
          Add channel
        </Button>
      </div>
      {blocked ? (
        <p className="text-small text-fg-muted">
          This tier allows one webhook. Connect a wallet to add more.
        </p>
      ) : null}
      {error ? <p className="text-small text-reddit">{error}</p> : null}
    </form>
  );
}
