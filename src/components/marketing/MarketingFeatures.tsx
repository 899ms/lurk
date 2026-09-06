import { MarketingPeople } from "./MarketingPeople";
import { MarketingFree } from "./MarketingFree";
import { MarketingScanCollage } from "./MarketingScanCollage";
import { MarketingSeoTiles } from "./MarketingSeoTiles";
import { OpenSourcePanel } from "./OpenSourcePanel";
import { MarketingDecisionTiles } from "./MarketingDecisionTiles";

export function MarketingFeatures() {
  return (
    <>
      <MarketingPeople />
      <MarketingFree />
      <MarketingScanCollage />
      <MarketingSeoTiles />
      <OpenSourcePanel />
      <MarketingDecisionTiles />
    </>
  );
}
