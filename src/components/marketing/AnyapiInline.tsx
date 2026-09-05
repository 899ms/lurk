import { AnyapiMark } from "@/components/AnyapiMark";

/** The AnyAPI mark and name, kept on one line inside running text. */
export function AnyapiInline() {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap align-middle">
      <AnyapiMark />
      AnyAPI
    </span>
  );
}
