import { AuthorAvatar } from "@/components/AuthorAvatar";

export type TimelineLead = {
  id: string;
  author: string | null;
  avatarUrl: string | null;
  subreddit: string;
  title: string;
  createdAt: Date;
};

type LeadTimelineProps = { leads: TimelineLead[] };

/** Hours to label under the axis, so the strip reads as a day. */
const AXIS_MARKS = [0, 6, 12, 18];

function hourLabel(hour: number): string {
  if (hour === 0) {
    return "12am";
  }
  return hour < 12 ? `${hour}am` : hour === 12 ? "12pm" : `${hour - 12}pm`;
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function dayLabel(time: number): string {
  return new Date(time).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Today's leads placed on the hour they were posted, with earlier days folded
 * into a count so the strip stays one day wide.
 */
export function LeadTimeline({ leads }: LeadTimelineProps) {
  const now = new Date();
  const today = startOfDay(now);
  const todays = leads.filter((lead) => lead.createdAt.getTime() >= today);
  const earlier = new Map<number, number>();
  for (const lead of leads) {
    const day = startOfDay(lead.createdAt);
    if (day < today) {
      earlier.set(day, (earlier.get(day) ?? 0) + 1);
    }
  }
  const hours = Array.from({ length: now.getHours() + 1 }, (_, hour) => hour);

  return (
    <div className="flex flex-col gap-3 rounded-card border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-mono tracking-wide text-fg-muted">
          TODAY - {todays.length} {todays.length === 1 ? "lead" : "leads"}
        </span>
        {[...earlier.entries()]
          .sort((a, b) => b[0] - a[0])
          .map(([day, total]) => (
            <span
              key={day}
              className="rounded-control bg-surface-2 px-2 py-0.5 text-mono text-fg-muted"
            >
              {dayLabel(day)} +{total}
            </span>
          ))}
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {hours.map((hour) => {
          const inHour = todays.filter((lead) => lead.createdAt.getHours() === hour);
          return (
            <div key={hour} className="flex w-8 shrink-0 flex-col items-center gap-1">
              <div className="flex min-h-8 flex-col-reverse items-center gap-1">
                {inHour.map((lead) => (
                  <span key={lead.id} title={`u/${lead.author ?? "unknown"} in r/${lead.subreddit}`}>
                    <AuthorAvatar name={lead.author} src={lead.avatarUrl} size={28} />
                  </span>
                ))}
              </div>
              <span className="h-2 w-px bg-border" aria-hidden="true" />
              <span className="text-[10px] text-fg-muted">
                {AXIS_MARKS.includes(hour) ? hourLabel(hour) : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
