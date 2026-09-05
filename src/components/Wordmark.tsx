import { PRODUCT_NAME } from "@/lib/brand";
import { AnyapiMark } from "./AnyapiMark";

/** "<Product> by [mark] AnyAPI" - the only place the product is named in chrome. */
export function Wordmark() {
  return (
    <span className="flex items-center gap-1.5 text-fg" style={{ fontWeight: 500 }}>
      {PRODUCT_NAME}
      <span className="text-fg-muted">by</span>
      <AnyapiMark />
      AnyAPI
    </span>
  );
}
