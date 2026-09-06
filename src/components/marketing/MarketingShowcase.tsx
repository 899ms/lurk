"use client";
import { useState } from "react";
import { PillTabs } from "@/components/PillTabs";
import { AppMockLeads } from "./AppMockLeads";
import { AppMockSeo } from "./AppMockSeo";
import { AppMockUsage } from "./AppMockUsage";
const TABS = [
  { id: "leads", label: "Leads" },
  { id: "seo", label: "Reddit SEO" },
  { id: "usage", label: "Data usage" },
];

export function MarketingShowcase() {
  const [tab, setTab] = useState("leads");
  return (
    <div className="marketing-showcase">
      <PillTabs tabs={TABS} activeId={tab} onSelect={setTab} />
      <div
        role="tabpanel"
        aria-label={TABS.find((item) => item.id === tab)?.label}
        className="product-mat"
      >
        {tab === "leads" ? <AppMockLeads /> : tab === "seo" ? <AppMockSeo /> : <AppMockUsage />}
      </div>
    </div>
  );
}
