/**
 * Whether any competitor is named in a thread. A plain case-insensitive match
 * on the title and the body: a competitor written any way a redditor writes it
 * still counts, and the flag only ever tells the user where to read.
 */
export function competitorNamed(
  competitors: string[],
  title: string,
  body: string | null,
): boolean {
  const haystack = `${title}\n${body ?? ""}`.toLowerCase();
  return competitors.some((name) => {
    const needle = name.trim().toLowerCase();
    return needle.length > 0 && haystack.includes(needle);
  });
}
