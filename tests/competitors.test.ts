import { beforeEach, describe, expect, it, vi } from "vitest";
import { competitorHost } from "@/lib/competitors/host";
import { mentionSeries } from "@/lib/competitors/read";
import { TIERS } from "@/lib/tiers";

const generateStructured = vi.fn();

vi.mock("@/lib/llm", () => ({ generateStructured }));
vi.mock("@/db", () => ({ db: () => ({}) }));

const { classifyMentions } = await import("@/lib/competitors/classify");
const { competitorsToScan } = await import("@/lib/competitors/scan");

describe("competitor cap", () => {
  const names = ["Typeform", "Jotform", "Tally", "Fillout"];

  it("watches only as many competitors as the free tier allows", () => {
    expect(competitorsToScan(names, TIERS.free)).toEqual(["Typeform", "Jotform", "Tally"]);
    expect(TIERS.free.competitors).toBe(3);
  });

  it("caps nothing for a connected wallet or a self-hosted instance", () => {
    expect(competitorsToScan(names, TIERS.connected)).toEqual(names);
    expect(competitorsToScan(names, null)).toEqual(names);
  });
});

describe("competitor host", () => {
  it("uses a favicon only when the name is a domain", () => {
    expect(competitorHost("typeform.com")).toBe("typeform.com");
    expect(competitorHost("https://www.jotform.com/pricing")).toBe("jotform.com");
    expect(competitorHost("Docs.Google.com")).toBe("docs.google.com");
  });

  it("falls back to initials for a plain product name", () => {
    expect(competitorHost("Typeform")).toBeNull();
    expect(competitorHost("Google Forms")).toBeNull();
    expect(competitorHost("")).toBeNull();
    expect(competitorHost("survey.")).toBeNull();
  });
});

describe("sentiment classification", () => {
  beforeEach(() => {
    generateStructured.mockReset();
  });

  it("keeps one verdict per post it sent", async () => {
    generateStructured.mockResolvedValue({
      mentions: [
        { id: "p1", sentiment: "negative", summary: " Leaving after a price rise " },
        { id: "p2", sentiment: "positive", summary: "Recommends it" },
      ],
    });
    const verdicts = await classifyMentions("project-1", "Typeform", [
      { id: "p1", title: "Done with it", subreddit: "SaaS", body: "the new price" },
      { id: "p2", title: "Works well", subreddit: "SaaS", body: "happy" },
    ]);
    expect(generateStructured.mock.calls[0][0].purpose).toBe("competitors");
    expect(verdicts.get("p1")).toEqual({
      sentiment: "negative",
      summary: "Leaving after a price rise",
    });
    expect(verdicts.get("p2")?.sentiment).toBe("positive");
  });

  it("drops an answer about a post it never sent, and a repeat", async () => {
    generateStructured.mockResolvedValue({
      mentions: [
        { id: "p1", sentiment: "neutral", summary: "First" },
        { id: "p1", sentiment: "positive", summary: "Second" },
        { id: "ghost", sentiment: "positive", summary: "Never sent" },
      ],
    });
    const verdicts = await classifyMentions("project-1", "Typeform", [
      { id: "p1", title: "Asking", subreddit: "SaaS", body: "which one" },
    ]);
    expect([...verdicts.keys()]).toEqual(["p1"]);
    expect(verdicts.get("p1")?.summary).toBe("First");
  });

  it("asks nothing when there are no posts", async () => {
    expect((await classifyMentions("project-1", "Typeform", [])).size).toBe(0);
    expect(generateStructured).not.toHaveBeenCalled();
  });
});

describe("mentions over time", () => {
  const now = new Date("2026-09-05T12:00:00Z");

  it("puts each mention in its own day and keeps a competitor with none", () => {
    const series = mentionSeries(
      [
        { competitor: "Typeform", createdAt: new Date("2026-09-05T09:00:00Z") },
        { competitor: "Typeform", createdAt: new Date("2026-09-05T10:00:00Z") },
        { competitor: "Typeform", createdAt: new Date("2026-08-27T10:00:00Z") },
      ],
      ["Typeform", "Jotform"],
      30,
      now,
    );
    const typeform = series.find((row) => row.competitor === "Typeform");
    expect(typeform?.days).toHaveLength(30);
    expect(typeform?.total).toBe(3);
    expect(typeform?.days[29]).toBe(2);
    expect(series.find((row) => row.competitor === "Jotform")?.total).toBe(0);
  });

  it("ignores a mention older than the window", () => {
    const series = mentionSeries(
      [{ competitor: "Typeform", createdAt: new Date("2026-01-01T00:00:00Z") }],
      ["Typeform"],
      30,
      now,
    );
    expect(series[0].total).toBe(0);
  });
});
