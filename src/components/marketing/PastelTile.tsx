import { MarketingFragment, type FragmentKind } from "./MarketingFragment";

export function PastelTile({
  kind,
  title,
  caption,
  tone,
}: {
  kind: FragmentKind;
  title: string;
  caption: string;
  tone: "pink" | "teal" | "mint" | "lilac";
}) {
  return (
    <figure className="pastel-tile">
      <div className={`pastel-art pastel-${tone}`}>
        <MarketingFragment kind={kind} />
      </div>
      <figcaption>
        <strong>{title}</strong> {caption}
      </figcaption>
    </figure>
  );
}
