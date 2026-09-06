import { familyKey, meaningWords } from "./phrases";

/**
 * The Google searches discovery buys. Half ask the problem in the buyer's own
 * words with no place in them, half ask it about one place this product's page
 * names. Both are scoped to Reddit communities, because a thread is the only
 * evidence this app can act on. Nothing here invents a phrasing or a place:
 * every query is built from what the product page itself said.
 */

/** What every discovery query is aimed at: a post inside some community. */
export const SITE_SCOPE = "site:reddit.com/r/";

/** A place this product serves, with the page text it was read from. */
export type Destination = { name: string; sourceText: string };

export type QueryKind = "problem" | "destination";

export type DiscoveryQuery = {
  query: string;
  /** The problem family this query asks about, which its evidence inherits. */
  family: string;
  /** The place it asks about, or null for a query with no place in it. */
  destination: string | null;
  kind: QueryKind;
};

/**
 * How many new relevant threads a round of expansion has to find to be worth
 * another one. Two rounds under this is the plan's stop rule.
 */
export const MIN_NEW_RELEVANT = 2;

function problemQuery(phrasing: string, destination: string | null): DiscoveryQuery {
  const body = meaningWords(phrasing).join(" ");
  return {
    query: [SITE_SCOPE, body, destination ?? ""].filter(Boolean).join(" ").trim(),
    family: familyKey(phrasing),
    destination,
    kind: destination === null ? "problem" : "destination",
  };
}

function unique(queries: DiscoveryQuery[]): DiscoveryQuery[] {
  const seen = new Set<string>();
  return queries.filter((item) => {
    if (seen.has(item.query)) {
      return false;
    }
    seen.add(item.query);
    return true;
  });
}

export type QueryPlanInput = {
  problemPhrasings: string[];
  destinations: Destination[];
  /** The tier's discovery budget: how many queries this first pass may buy. */
  budget: number;
};

/**
 * The opening set: an even split between the problem asked with no place and
 * the problem asked about a place, so a product that sells in twenty cities
 * cannot spend its whole budget on one of them, and a product whose page names
 * no place still asks the problem in full.
 */
export function buildDiscoveryQueries(input: QueryPlanInput): DiscoveryQuery[] {
  const phrasings = input.problemPhrasings.filter((phrase) => meaningWords(phrase).length > 0);
  if (phrasings.length === 0 || input.budget <= 0) {
    return [];
  }
  const withPlace = input.destinations.length > 0;
  const problemSlots = withPlace ? Math.floor(input.budget / 2) : input.budget;
  const problem = phrasings.slice(0, problemSlots).map((phrase) => problemQuery(phrase, null));
  const destination = input.destinations
    .slice(0, input.budget - problem.length)
    .map((place, index) => problemQuery(phrasings[index % phrasings.length], place.name));
  return unique([...problem, ...destination]).slice(0, input.budget);
}

/** How much relevant evidence each family and each place has produced so far. */
export type Coverage = {
  families: Record<string, number>;
  destinations: Record<string, number>;
};

export type ExpansionInput = QueryPlanInput & {
  /** Every query already bought for this project. */
  used: DiscoveryQuery[];
  coverage: Coverage;
  /** The tier's hard maximum: used and proposed together may not pass it. */
  max: number;
};

function pairKey(family: string, destination: string | null): string {
  return `${family}|${destination ?? ""}`;
}

/**
 * What to ask next when a problem family or a place has produced no relevant
 * thread. Unasked phrasings and unasked places come first, because a cluster
 * that was never queried is not a cluster that failed. Then the pairs we have
 * not put together yet, weakest family against best-covered place, so an
 * expansion spends on the hole while leaning on a place already proven.
 */
export function expandDiscoveryQueries(input: ExpansionInput): DiscoveryQuery[] {
  const room = input.max - input.used.length;
  if (room <= 0) {
    return [];
  }
  const askedFamilies = new Set(input.used.map((item) => item.family));
  const askedPairs = new Set(input.used.map((item) => pairKey(item.family, item.destination)));
  const askedPlaces = new Set(
    input.used.map((item) => item.destination).filter((name): name is string => name !== null),
  );
  const phrasings = input.problemPhrasings.filter((phrase) => meaningWords(phrase).length > 0);
  const covered = (family: string) => input.coverage.families[family] ?? 0;
  const bestPhrasing = [...phrasings].sort(
    (left, right) => covered(familyKey(right)) - covered(familyKey(left)),
  )[0];

  const proposals: DiscoveryQuery[] = [];
  for (const phrase of phrasings) {
    if (!askedFamilies.has(familyKey(phrase))) {
      proposals.push(problemQuery(phrase, null));
    }
  }
  for (const place of input.destinations) {
    if (!askedPlaces.has(place.name) && bestPhrasing) {
      proposals.push(problemQuery(bestPhrasing, place.name));
    }
  }
  const places = [...input.destinations].sort(
    (left, right) =>
      (input.coverage.destinations[right.name] ?? 0) - (input.coverage.destinations[left.name] ?? 0),
  );
  const weakestFirst = [...phrasings].sort(
    (left, right) => covered(familyKey(left)) - covered(familyKey(right)),
  );
  for (const phrase of weakestFirst) {
    for (const place of places) {
      if (!askedPairs.has(pairKey(familyKey(phrase), place.name))) {
        proposals.push(problemQuery(phrase, place.name));
      }
    }
  }
  return unique(proposals)
    .filter((item) => !askedPairs.has(pairKey(item.family, item.destination)))
    .slice(0, room);
}

/**
 * Whether expansion has stopped paying for itself: two rounds in a row that
 * each found fewer than MIN_NEW_RELEVANT new relevant threads.
 */
export function expansionShouldStop(newRelevantPerRound: number[]): boolean {
  const last = newRelevantPerRound.slice(-2);
  return last.length === 2 && last.every((count) => count < MIN_NEW_RELEVANT);
}
