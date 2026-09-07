import { AuthorAvatar } from "@/components/AuthorAvatar";
import { groupByDay, scoreRing, type StreamEntry } from "@/components/leads/stream";

type PeopleStripProps = { entries: StreamEntry[] };

const AVATAR = 32;

function face(entry: StreamEntry) {
  if (entry.kind === "lead") {
    return {
      name: entry.lead.author,
      src: entry.lead.avatarUrl,
      subreddit: entry.lead.subreddit,
      className: `inline-flex rounded-full ring-2 ring-offset-2 ring-offset-surface ${scoreRing(entry.lead.score)}`,
    };
  }
  return {
    name: entry.item.author,
    src: entry.item.avatarUrl,
    subreddit: entry.item.subreddit,
    className: "inline-flex rounded-full opacity-50",
  };
}

/**
 * Every person this scan surfaced, grouped by the day they posted and newest
 * first. A lead wears a coloured ring, a held person is faded.
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
            {day.entries.map((entry) => {
              const who = face(entry);
              return (
                <span
                  key={entry.id}
                  className={who.className}
                  title={`u/${who.name ?? "unknown"} in r/${who.subreddit}`}
                >
                  <AuthorAvatar name={who.name} src={who.src} size={AVATAR} />
                </span>
              );
            })}
          </div>
          <span className="text-mono text-fg-muted">{day.label}</span>
        </div>
      ))}
    </div>
  );
}
