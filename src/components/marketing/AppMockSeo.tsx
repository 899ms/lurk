import { Hash, Search, Users } from "lucide-react";
import { KeywordSection } from "@/components/seo/KeywordSection";
import { MockButton } from "./MockButton";
import { MockFilterPills } from "./MockFilterPills";
import { MockFrame } from "./MockFrame";
import { MOCK_SEO_COST, MOCK_SEO_KEYWORDS } from "./mockContent";

const ICON = "size-3.5 shrink-0 text-fg-muted";

const PILLS = [
  { icon: <Search className={ICON} aria-hidden="true" />, label: "All keywords" },
  { icon: <Hash className={ICON} aria-hidden="true" />, label: "All subreddits" },
  { icon: <Users className={ICON} aria-hidden="true" />, label: "Any thread" },
];

/** Reddit SEO: the threads Google already ranks for what you sell. */
export function AppMockSeo() {
  return (
    <MockFrame
      active="Reddit SEO"
      title="Reddit SEO"
      actions={<MockButton label="Refresh now" tone="solid" />}
    >
      <div className="flex flex-col gap-6 p-4">
        <MockFilterPills pills={PILLS} />
        {MOCK_SEO_KEYWORDS.map((group) => (
          <KeywordSection
            key={group.keyword}
            keyword={group.keyword}
            monthlyVolume={group.monthlyVolume}
            threads={group.threads}
            cost={MOCK_SEO_COST}
          />
        ))}
        <p className="text-mono text-fg-muted">
          Monthly search volume is on when you connect an AnyAPI wallet. It bills at the catalog
          price for that call.
        </p>
      </div>
    </MockFrame>
  );
}
