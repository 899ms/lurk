import { MarketingIntro } from "./MarketingIntro";
import { OpenSourceBlock } from "./OpenSourceBlock";
import { MarketingScanStory } from "./MarketingScanStory";
import { MarketingSeoStory } from "./MarketingSeoStory";
import { MarketingIntentSections } from "./MarketingIntentSections";
import { MarketingAlerts } from "./MarketingAlerts";
import { MarketingResearchSections } from "./MarketingResearchSections";
import { MarketingCostTable } from "./MarketingCostTable";
import { MarketingApiPanel } from "./MarketingApiPanel";

export function MarketingFeatures() {
  return (
    <>
      <MarketingIntro />
      <OpenSourceBlock />
      <MarketingScanStory />
      <MarketingSeoStory />
      <MarketingIntentSections />
      <MarketingAlerts />
      <MarketingResearchSections />
      <MarketingCostTable />
      <MarketingApiPanel />
    </>
  );
}
