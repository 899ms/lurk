import { MarketingIntro } from "./MarketingIntro";
import { MarketingDiscovery } from "./MarketingDiscovery";
import { MarketingCostTable } from "./MarketingCostTable";
import { MarketingIntentSections } from "./MarketingIntentSections";
import { MarketingResearchSections } from "./MarketingResearchSections";
import { MarketingApiPanel } from "./MarketingApiPanel";

export function MarketingFeatures() {
  return (
    <>
      <MarketingIntro />
      <MarketingDiscovery />
      <MarketingCostTable />
      <MarketingIntentSections />
      <MarketingResearchSections />
      <MarketingApiPanel />
    </>
  );
}
