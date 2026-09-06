import { AuthorAvatar } from "@/components/AuthorAvatar";
import { MOCK_TIMELINE } from "./mockContent";

/** Real participants in the saved thread; no invented hours or lead totals. */
export function MockTimeline() {
  return (
    <div className="mock-timeline">
      <div className="avatar-stack">
        {MOCK_TIMELINE.map((mark) => (
          <span key={mark.author} title={`u/${mark.author}`}>
            <AuthorAvatar name={mark.author} src={mark.avatar} size={30} />
          </span>
        ))}
      </div>
      <span>One thread. More than one person asking.</span>
      <span className="mock-timeline-line" />
      <small>Saved conversation</small>
    </div>
  );
}
