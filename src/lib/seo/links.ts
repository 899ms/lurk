/** One organic Google result, as google.search returns it. */
export type GoogleResult = {
  title?: string;
  link: string;
  snippet?: string;
  position: number;
};

/**
 * Only reddit.com itself counts. A result on a mirror or an aggregator that
 * merely quotes a thread is not a thread we can open through reddit.post.
 */
export function isRedditLink(raw: string): boolean {
  let host: string;
  try {
    host = new URL(raw).hostname.toLowerCase();
  } catch {
    return false;
  }
  return host === "reddit.com" || host.endsWith(".reddit.com");
}

/** The community from a thread URL's /r/<name>/comments/... path, else "". */
export function subredditFromUrl(raw: string): string {
  let path: string;
  try {
    path = new URL(raw).pathname;
  } catch {
    return "";
  }
  const parts = path.replace(/^\/+|\/+$/g, "").split("/");
  for (let i = 0; i + 1 < parts.length; i += 1) {
    if (parts[i] === "r" && parts[i + 1]) {
      return parts[i + 1];
    }
  }
  return "";
}

/** The Reddit threads among a page of Google results, in Google's order. */
export function redditResults(results: GoogleResult[]): GoogleResult[] {
  return results.filter((result) => isRedditLink(result.link ?? ""));
}
