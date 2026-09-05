import { MarketingVariantA } from "@/components/marketing/MarketingVariantA";
import { MarketingVariantB } from "@/components/marketing/MarketingVariantB";
import { MarketingVariantC } from "@/components/marketing/MarketingVariantC";
import { VARIANTS, VariantSwitcher, type Variant } from "@/components/marketing/VariantSwitcher";

function readVariant(value: string | string[] | undefined): Variant {
  const first = Array.isArray(value) ? value[0] : value;
  return VARIANTS.includes(first as Variant) ? (first as Variant) : "a";
}

type MarketingPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MarketingPage({ searchParams }: MarketingPageProps) {
  const variant = readVariant((await searchParams).v);
  return (
    <>
      {/* Room under the page so the fixed variant pill never covers the footer. */}
      <div className="pb-16">
        {variant === "a" ? <MarketingVariantA /> : null}
        {variant === "b" ? <MarketingVariantB /> : null}
        {variant === "c" ? <MarketingVariantC /> : null}
      </div>
      <VariantSwitcher active={variant} />
    </>
  );
}
