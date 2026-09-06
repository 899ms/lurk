import { describe, expect, it } from "vitest";
import { keepCitedLabels, type ThreadLabel } from "@/lib/discovery/label";
import { planFromRanks } from "@/lib/discovery/plan";
import {
  buildDiscoveryQueries,
  expandDiscoveryQueries,
  expansionShouldStop,
  SITE_SCOPE,
  type Destination,
} from "@/lib/discovery/queries";
import {
  compileBooleanQuery,
  competitorsFrom,
  coverageFrom,
  dedupeThreads,
  isDestinationQuery,
  mergeCompetitors,
  rankCommunities,
  rankFamilies,
  scopedBooleanQuery,
  type EvidenceLike,
} from "@/lib/discovery/rank";
import { askedQueries } from "@/lib/discovery/refresh";
import { TIERS } from "@/lib/tiers";

/**
 * HotelsAllow is the project the plan is proved against: a site that lists
 * hotels which check in guests under 21, in a handful of American cities. Its
 * eight opening queries and the threads they return are the fixture, because
 * every decision here - which community, which search, which competitor - is
 * only worth anything if it survives this one real product.
 */

const PHRASINGS = [
  "hotels that let 18 year olds check in",
  "which hotels can I book at 19 without being turned away",
  "hotels with no minimum age under 21",
  "where can I stay at 20 years old",
];

const DESTINATIONS: Destination[] = [
  { name: "Las Vegas", sourceText: "Hotels in Las Vegas" },
  { name: "New York", sourceText: "Hotels in New York" },
  { name: "Miami", sourceText: "Hotels in Miami" },
  { name: "Chicago", sourceText: "Hotels in Chicago" },
];

const DESTINATION_NAMES = DESTINATIONS.map((place) => place.name);

describe("the queries discovery buys", () => {
  const queries = buildDiscoveryQueries({
    problemPhrasings: PHRASINGS,
    destinations: DESTINATIONS,
    budget: TIERS.free.discoveryQueries,
  });

  it("splits the budget between the problem and the places the page names", () => {
    expect(queries).toHaveLength(8);
    expect(queries.filter((item) => item.destination === null)).toHaveLength(4);
    expect(queries.filter((item) => item.destination !== null)).toHaveLength(4);
    expect(queries.every((item) => item.query.startsWith(SITE_SCOPE))).toBe(true);
  });

  it("asks in the buyer's words and keeps the age, the negation and the check-in", () => {
    expect(queries[0].query).toBe(`${SITE_SCOPE} hotels let 18 year olds check`);
    expect(queries[1].query).toContain("19");
    expect(queries[1].query).toContain("without");
    expect(queries[2].query).toContain("no minimum");
  });

  it("puts the city in the query rather than in a location parameter", () => {
    const placed = queries.filter((item) => item.destination !== null);
    expect(placed.map((item) => item.destination)).toEqual(DESTINATION_NAMES);
    expect(placed[0].query.endsWith("Las Vegas")).toBe(true);
  });

  it("spends the whole budget on the problem when the page names no place", () => {
    const noPlace = buildDiscoveryQueries({
      problemPhrasings: PHRASINGS,
      destinations: [],
      budget: TIERS.free.discoveryQueries,
    });
    expect(noPlace).toHaveLength(PHRASINGS.length);
    expect(noPlace.every((item) => item.destination === null)).toBe(true);
  });

  it("asks nothing at all when the page gave it no phrasing", () => {
    expect(
      buildDiscoveryQueries({ problemPhrasings: [], destinations: DESTINATIONS, budget: 8 }),
    ).toEqual([]);
  });
});

describe("expanding into what produced nothing", () => {
  const used = buildDiscoveryQueries({
    problemPhrasings: PHRASINGS,
    destinations: DESTINATIONS,
    budget: TIERS.free.discoveryQueries,
  });

  it("stops at the tier's hard maximum however empty the evidence is", () => {
    const more = expandDiscoveryQueries({
      problemPhrasings: PHRASINGS,
      destinations: DESTINATIONS,
      budget: TIERS.free.discoveryQueries,
      used,
      coverage: { families: {}, destinations: {} },
      max: TIERS.free.discoveryQueriesMax,
    });
    expect(more).toHaveLength(TIERS.free.discoveryQueriesMax - used.length);
    expect(new Set(more.map((item) => item.query)).size).toBe(more.length);
    expect(more.some((item) => used.some((old) => old.query === item.query))).toBe(false);
  });

  it("pairs the family with nothing behind it against the place that worked", () => {
    const [first] = expandDiscoveryQueries({
      problemPhrasings: PHRASINGS,
      destinations: DESTINATIONS,
      budget: TIERS.free.discoveryQueries,
      used,
      coverage: {
        families: { "hotels-let-18": 6, "hotels-no-minimum": 4, "stay-20-years": 2 },
        destinations: { "Las Vegas": 9, Chicago: 0 },
      },
      max: TIERS.free.discoveryQueriesMax,
    });
    expect(first.family).toBe("hotels-book-19");
    expect(first.destination).toBe("Las Vegas");
  });

  it("proposes nothing once every pair has been asked", () => {
    const everything = [
      ...used,
      ...expandDiscoveryQueries({
        problemPhrasings: PHRASINGS,
        destinations: DESTINATIONS,
        budget: 8,
        used,
        coverage: { families: {}, destinations: {} },
        max: 100,
      }),
    ];
    expect(
      expandDiscoveryQueries({
        problemPhrasings: PHRASINGS,
        destinations: DESTINATIONS,
        budget: 8,
        used: everything,
        coverage: { families: {}, destinations: {} },
        max: 100,
      }),
    ).toEqual([]);
  });

  it("gives up after two rounds that each found under two new relevant threads", () => {
    expect(expansionShouldStop([])).toBe(false);
    expect(expansionShouldStop([0])).toBe(false);
    expect(expansionShouldStop([5, 1])).toBe(false);
    expect(expansionShouldStop([1, 0])).toBe(true);
    expect(expansionShouldStop([0, 0, 4])).toBe(false);
  });
});

describe("labels the model has to cite", () => {
  const label = (id: string): ThreadLabel => ({
    id,
    relevance: "relevant",
    destination: null,
    entities: [],
  });

  it("drops a label about a thread we never showed it", () => {
    const kept = keepCitedLabels([label("a1"), label("invented"), label("a2")], ["a1", "a2"]);
    expect(kept.map((item) => item.id)).toEqual(["a1", "a2"]);
  });

  it("keeps the first answer when one thread was labelled twice", () => {
    const kept = keepCitedLabels(
      [label("a1"), { ...label("a1"), relevance: "irrelevant" }],
      ["a1"],
    );
    expect(kept).toHaveLength(1);
    expect(kept[0].relevance).toBe("relevant");
  });
});

/** The threads the eight queries came back with, as Google ordered them. */
const BROAD = `${SITE_SCOPE} hotels let 18 year olds check`;
const BROAD_TWO = `${SITE_SCOPE} hotels no minimum age under 21`;
const VEGAS = `${SITE_SCOPE} hotels let 18 year olds check Las Vegas`;
const NEW_YORK = `${SITE_SCOPE} hotels let 18 year olds check New York`;

const EVIDENCE: EvidenceLike[] = [
  {
    postId: "t1",
    subreddit: "hotels",
    query: BROAD,
    family: "hotels-let-18",
    destination: null,
    position: 1,
    title: "Hotels that let 18 year olds check in",
    snippet: "I turn 19 next month and need a room.",
    relevance: "relevant",
  },
  {
    postId: "t2",
    subreddit: "hotels",
    query: BROAD_TWO,
    family: "hotels-no-minimum",
    destination: null,
    position: 2,
    title: "Hotel under 21 check in",
    snippet: "Front desk turned me away for being 20.",
    relevance: "relevant",
  },
  {
    postId: "t3",
    subreddit: "askhotels",
    query: BROAD,
    family: "hotels-let-18",
    destination: null,
    position: 3,
    title: "Hotels for 19 year olds",
    snippet: "Anywhere that will check me in at 19?",
    relevance: "relevant",
  },
  {
    postId: "t4",
    subreddit: "travel",
    query: BROAD,
    family: "hotels-let-18",
    destination: null,
    position: 4,
    title: "Travelling at 20, hotels keep refusing",
    snippet: "Every desk wants 21.",
    relevance: "plausible",
  },
  {
    postId: "t5",
    subreddit: "TravelHacks",
    query: BROAD_TWO,
    family: "hotels-no-minimum",
    destination: null,
    position: 8,
    title: "Cheapest way to fly standby",
    snippet: "Nothing to do with hotels.",
    relevance: "irrelevant",
  },
  {
    postId: "t6",
    subreddit: "vegas",
    query: VEGAS,
    family: "hotels-let-18",
    destination: "Las Vegas",
    position: 1,
    title: "Hotels 20 year olds Las Vegas",
    snippet: "Which strip hotels check in under 21? hotelages.com says four.",
    relevance: "relevant",
  },
  {
    postId: "t7",
    subreddit: "vegas",
    query: VEGAS,
    family: "hotels-let-18",
    destination: "Las Vegas",
    position: 5,
    title: "Best buffet on the strip",
    snippet: "Food, not rooms.",
    relevance: "irrelevant",
  },
  {
    postId: "t8",
    subreddit: "AskNYC",
    query: NEW_YORK,
    family: "hotels-let-18",
    destination: "New York",
    position: 2,
    title: "Hotels that let 19 year olds check in New York",
    snippet: "Staying alone at 19.",
    relevance: "relevant",
  },
  {
    postId: "t1",
    subreddit: "hotels",
    query: VEGAS,
    family: "hotels-let-18",
    destination: "Las Vegas",
    position: 6,
    title: "Hotels that let 18 year olds check in",
    snippet: "I turn 19 next month and need a room.",
    relevance: "relevant",
  },
];

describe("what the evidence says about communities", () => {
  it("counts one thread once however many queries returned it", () => {
    const threads = dedupeThreads(EVIDENCE);
    expect(threads).toHaveLength(8);
    const shared = threads.find((thread) => thread.postId === "t1");
    expect(shared?.bestPosition).toBe(1);
    expect(shared?.destinations).toEqual(["Las Vegas"]);
  });

  it("tells a query about a place from a query about the problem", () => {
    expect(isDestinationQuery(VEGAS, DESTINATION_NAMES)).toBe(true);
    expect(isDestinationQuery(BROAD, DESTINATION_NAMES)).toBe(false);
  });

  it("puts the communities the problem is discussed in first", () => {
    const ranked = rankCommunities(EVIDENCE, DESTINATION_NAMES);
    expect(ranked[0].name).toBe("hotels");
    expect(ranked.map((item) => item.name)).toContain("askhotels");
    expect(ranked.find((item) => item.name === "hotels")?.families).toBe(2);
  });

  it("reaches a city community the broad queries would have buried", () => {
    const ranked = rankCommunities(EVIDENCE, DESTINATION_NAMES).map((item) => item.name);
    expect(ranked[1]).toBe("asknyc");
    expect(ranked.indexOf("vegas")).toBeLessThan(ranked.indexOf("travelhacks"));
  });

  it("gives a community whose only threads were irrelevant no weight at all", () => {
    const ranked = rankCommunities(EVIDENCE, DESTINATION_NAMES);
    expect(ranked.find((item) => item.name === "travelhacks")?.weighted).toBe(0);
  });

  it("smooths the relevant share, so one hit does not beat a proven community", () => {
    const ranked = rankCommunities(EVIDENCE, DESTINATION_NAMES);
    const vegas = ranked.find((item) => item.name === "vegas");
    expect(vegas?.weighted).toBe(1);
    expect(vegas?.fraction).toBe(0.5);
  });

  it("reads coverage off the same evidence expansion is judged on", () => {
    const coverage = coverageFrom(EVIDENCE);
    expect(coverage.families["hotels-let-18"]).toBe(5);
    expect(coverage.destinations["Las Vegas"]).toBe(2);
  });
});

describe("what the evidence says to search for", () => {
  it("collapses the city out of a phrase so one demand is one family", () => {
    const families = rankFamilies(EVIDENCE, DESTINATION_NAMES);
    const top = families[0];
    expect(top.family).toBe("hotels-let-18");
    expect(top.phrases).toContain("hotels 20 year olds");
    expect(top.phrases).toContain("hotels that let 19 year olds check in");
  });

  it("compiles a family into a Reddit search for the demand, not the topic", () => {
    expect(
      compileBooleanQuery([
        "hotels that let 18 year olds check in",
        "hotels for 19 year olds",
        "hotel under 21 check in",
        "hotels 20 year olds",
      ]),
    ).toBe('(hotel OR hotels) AND (18 OR 19 OR 20 OR "check in" OR "under 21")');
  });

  it("scopes the same search to one community", () => {
    expect(scopedBooleanQuery("(hotel OR hotels)", "vegas")).toBe(
      "subreddit:vegas AND (hotel OR hotels)",
    );
  });
});

describe("competitors", () => {
  const labels: ThreadLabel[] = [
    {
      id: "t6",
      relevance: "relevant",
      destination: "Las Vegas",
      entities: [
        { name: "hotelages.com", role: "direct_substitute" },
        { name: "Booking.com", role: "booking_alternative" },
        { name: "r/vegas", role: "reference" },
      ],
    },
    {
      id: "t8",
      relevance: "relevant",
      destination: "New York",
      entities: [{ name: "hotelages.com", role: "direct_substitute" }],
    },
  ];

  it("keeps only what does the same job for the same person", () => {
    expect(competitorsFrom(labels)).toEqual([
      { name: "hotelages.com", role: "direct_substitute", evidence: 2 },
    ]);
  });

  it("adds a delta's evidence to what already stood", () => {
    expect(
      mergeCompetitors(
        [{ name: "hotelages.com", role: "direct_substitute", evidence: 2 }],
        competitorsFrom(labels),
      ),
    ).toEqual([{ name: "hotelages.com", role: "direct_substitute", evidence: 4 }]);
  });
});

describe("the plan the ranking publishes", () => {
  const plan = planFromRanks({
    communities: rankCommunities(EVIDENCE, DESTINATION_NAMES),
    families: rankFamilies(EVIDENCE, DESTINATION_NAMES),
    competitors: [{ name: "hotelages.com", role: "direct_substitute", evidence: 2 }],
    scopedCommunities: ["vegas"],
    limits: { ...TIERS.free, subredditsPerProject: 3 },
  });

  it("gives no community without evidence a row of any kind", () => {
    expect(plan.subreddits.map((row) => row.name)).not.toContain("travelhacks");
  });

  it("reads the top communities and leaves the rest waiting", () => {
    expect(plan.subreddits.filter((row) => row.state === "active")).toHaveLength(3);
    expect(plan.subreddits.filter((row) => row.state === "candidate").length).toBeGreaterThan(0);
    expect(plan.subreddits[0].state).toBe("active");
  });

  it("searches the compiled families and the discovered city community", () => {
    expect(plan.keywords.some((row) => row.keyword.startsWith("subreddit:vegas AND "))).toBe(true);
    expect(plan.keywords.every((row) => row.evidence > 0)).toBe(true);
  });
});

describe("reading back what a project has already asked", () => {
  it("recognises a place query by the place in it, not by a stored flag", () => {
    const asked = askedQueries(EVIDENCE, DESTINATION_NAMES);
    expect(asked).toHaveLength(4);
    expect(asked.find((item) => item.query === VEGAS)?.destination).toBe("Las Vegas");
    expect(asked.find((item) => item.query === BROAD)?.destination).toBeNull();
  });
});
