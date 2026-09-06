"use client";
import { useState } from "react";
import { PillTabs } from "@/components/PillTabs";
import { AppMockLeads } from "./AppMockLeads";
import { AppMockSeo } from "./AppMockSeo";
import { AppMockDrafts } from "./AppMockDrafts";
import { BRAND_MARKS } from "./BrandWord";
const TABS = [
  { id: "leads", label: "Leads" },
  { id: "seo", label: "Reddit SEO", mark: BRAND_MARKS.Reddit },
  { id: "drafts", label: "Drafts" },
];

export function MarketingShowcase() {
  const [tab, setTab] = useState("seo");
  return (
    <div className="marketing-showcase">
      <PillTabs tabs={TABS} activeId={tab} onSelect={setTab} />
      <div
        role="tabpanel"
        aria-label={TABS.find((item) => item.id === tab)?.label}
        className="product-mat"
      >
        {tab === "leads" ? <AppMockLeads /> : tab === "seo" ? <AppMockSeo /> : <AppMockDrafts />}
      </div>
    </div>
  );
}
