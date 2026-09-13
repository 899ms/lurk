import { AuthorAvatar } from "@/components/AuthorAvatar";
import { groupByDay, scoreRing, type StreamEntry } from "@/components/leads/stream";

type PeopleStripProps = { entries: StreamEntry[] };

const AVATAR = 32;

/**
 * Every person this project has a lead on, grouped by the day they posted and
 * newest first. Only leads: a face here is someone worth answering.
 */
export function PeopleStrip({ entries }: PeopleStripProps) {
  const days = groupByDay(entries);
  if (days.length === 0) {
    return null;
  }
  return (
    <div className="flex gap-6 overflow-x-auto rounded-card border bg-surface px-4 py-3">
      {days.map((day) => (
        <div key={day.day} className="flex shrink-0 flex-col items-start gap-2">
          <div className="flex items-center gap-2 pt-1 pr-1">
            {day.entries.map((entry) => (
              <span
                key={entry.id}
                className={`inline-flex rounded-full ring-2 ring-offset-2 ring-offset-surface ${scoreRing(entry.lead.score)}`}
                title={`u/${entry.lead.author ?? "unknown"} in r/${entry.lead.subreddit}`}
              >
                <AuthorAvatar name={entry.lead.author} src={entry.lead.avatarUrl} size={AVATAR} />
              </span>
            ))}
          </div>
          <span className="text-mono text-fg-muted">{day.label}</span>
        </div>
      ))}
    </div>
  );
}
