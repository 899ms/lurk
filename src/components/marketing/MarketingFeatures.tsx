import { MarketingPeople } from "./MarketingPeople";
import { MarketingCostTable } from "./MarketingCostTable";
import { MarketingScanCollage } from "./MarketingScanCollage";
import { MarketingSeoTiles } from "./MarketingSeoTiles";
import { OpenSourcePanel } from "./OpenSourcePanel";
import { MarketingDecisionTiles } from "./MarketingDecisionTiles";

export function MarketingFeatures() {
  return (
    <>
      <MarketingPeople />
      <MarketingCostTable />
      <MarketingScanCollage />
      <MarketingSeoTiles />
      <OpenSourcePanel />
      <MarketingDecisionTiles />
    </>
  );
}
