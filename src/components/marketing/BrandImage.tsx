type BrandImageProps = { name: string; src?: string; domain?: string; size?: number };

/** Real brand art or Google's product favicon, never a stand-in. */
export function BrandImage({ name, src, domain, size = 20 }: BrandImageProps) {
  return (
    // External favicons and Reddit CDNs do not need the Next image proxy.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src ?? `https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
      alt={name}
      width={size}
      height={size}
      className="brand-image"
    />
  );
}
