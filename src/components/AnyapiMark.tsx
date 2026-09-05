type AnyapiMarkProps = { size?: number };

/** The AnyAPI mark, used only inside the wordmark. */
export function AnyapiMark({ size = 16 }: AnyapiMarkProps) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/anyapi-mark.svg" alt="" width={size} height={size} aria-hidden="true" />;
}
