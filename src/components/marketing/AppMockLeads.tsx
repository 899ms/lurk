import { CalendarDays, Filter, Hash, Target } from "lucide-react";
import { MockButton } from "./MockButton";
import { MockFilterPills } from "./MockFilterPills";
import { MockFrame } from "./MockFrame";
import { MockLeadCard } from "./MockLeadCard";
import { MockTimeline } from "./MockTimeline";
import { MOCK_LEADS } from "./mockContent";

const ICON = "size-3.5 shrink-0 text-fg-muted";

const PILLS = [
  { icon: <CalendarDays className={ICON} aria-hidden="true" />, label: "30 days" },
  { icon: <Hash className={ICON} aria-hidden="true" />, label: "All subreddits" },
  { icon: <Target className={ICON} aria-hidden="true" />, label: "Any stage" },
  { icon: <Filter className={ICON} aria-hidden="true" />, label: "New" },
];

/** The lead feed: filters, the day's faces, then one card per lead. */
export function AppMockLeads() {
  return (
    <MockFrame active="Leads" title="Leads" actions={<MockButton label="Scan now" tone="solid" />}>
      <div className="flex flex-col gap-4 p-4">
        <MockFilterPills pills={PILLS} />
        <MockTimeline />
        {MOCK_LEADS.map((lead) => (
          <MockLeadCard key={lead.author} lead={lead} />
        ))}
      </div>
    </MockFrame>
  );
}
