import { AuthorAvatar } from "@/components/AuthorAvatar";
import { MOCK_TIMELINE, MOCK_TIMELINE_EARLIER } from "./mockContent";

/** Hours to label under the axis, so the strip reads as a day. */
const AXIS_MARKS = [0, 6, 12, 18];

/** The strip stops at the hour of the last scan, as it does in the app. */
const LAST_HOUR = 20;

function hourLabel(hour: number): string {
  if (hour === 0) {
    return "12am";
  }
  return hour < 12 ? `${hour}am` : hour === 12 ? "12pm" : `${hour - 12}pm`;
}

/** Today's leads on the hour they were posted, the app's own scan strip. */
export function MockTimeline() {
  const hours = Array.from({ length: LAST_HOUR + 1 }, (_, hour) => hour);
  return (
    <div className="flex flex-col gap-3 rounded-card border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-mono tracking-wide text-fg-muted">
          TODAY - {MOCK_TIMELINE.length} leads
        </span>
        {MOCK_TIMELINE_EARLIER.map((day) => (
          <span
            key={day}
            className="rounded-control bg-surface-2 px-2 py-0.5 text-mono text-fg-muted"
          >
            {day}
          </span>
        ))}
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {hours.map((hour) => (
          <div key={hour} className="flex w-8 shrink-0 flex-col items-center gap-1">
            <div className="flex min-h-8 flex-col-reverse items-center gap-1">
              {MOCK_TIMELINE.filter((mark) => mark.hour === hour).map((mark) => (
                <span key={mark.author} title={`u/${mark.author} in r/${mark.subreddit}`}>
                  <AuthorAvatar name={mark.author} src={mark.avatar} size={28} />
                </span>
              ))}
            </div>
            <span className="h-2 w-px bg-border" aria-hidden="true" />
            <span className="text-[10px] text-fg-muted">
              {AXIS_MARKS.includes(hour) ? hourLabel(hour) : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
