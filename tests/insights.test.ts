import { beforeEach, describe, expect, it, vi } from "vitest";

const generateStructured = vi.fn();

vi.mock("@/lib/llm", () => ({ generateStructured }));
vi.mock("@/db", () => ({ db: () => ({}) }));

const { MAX_THEMES, THEME_BATCH_SIZE, clusterLeads, mergeThemes } = await import(
  "@/lib/insights/themes"
);

type Input = Parameters<typeof clusterLeads>[1];

function leadsNamed(count: number): Input {
  return Array.from({ length: count }, (_, index) => ({
    id: `lead-${index}`,
    title: `Post ${index}`,
    reason: "asked for a recommendation",
    matchedPhrase: "looking for something cheaper",
    stage: "solution_seeking",
  }));
}

describe("theme assembly", () => {
  it("puts the biggest theme first and keeps a lead in one theme", () => {
    const merged = mergeThemes(
      [
        [
          { label: "Pricing", summary: "Too expensive", leadIds: ["a"] },
          { label: "Onboarding", summary: "Hard to start", leadIds: ["b", "c"] },
        ],
      ],
      ["a", "b", "c"],
    );
    expect(merged.map((theme) => theme.label)).toEqual(["Onboarding", "Pricing"]);
    expect(merged[0].leadIds).toEqual(["b", "c"]);
  });

  it("folds the same label from two batches into one theme", () => {
    const merged = mergeThemes(
      [
        [{ label: "Pricing", summary: "Too expensive", leadIds: ["a"] }],
        [{ label: "pricing ", summary: "Cost again", leadIds: ["b"] }],
      ],
      ["a", "b"],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].leadIds).toEqual(["a", "b"]);
    expect(merged[0].summary).toBe("Too expensive");
  });

  it("drops a lead id the model invented and a lead it repeated", () => {
    const merged = mergeThemes(
      [
        [
          { label: "Pricing", summary: "Cost", leadIds: ["a", "made-up"] },
          { label: "Support", summary: "Slow replies", leadIds: ["a"] },
        ],
      ],
      ["a"],
    );
    expect(merged).toEqual([{ label: "Pricing", summary: "Cost", leadIds: ["a"] }]);
  });

  it("shows no more themes than the screen has room for", () => {
    const themes = Array.from({ length: MAX_THEMES + 3 }, (_, index) => ({
      label: `Theme ${index}`,
      summary: "One sentence",
      leadIds: [`lead-${index}`],
    }));
    const ids = themes.map((theme) => theme.leadIds[0]);
    expect(mergeThemes([themes], ids)).toHaveLength(MAX_THEMES);
  });
});

describe("clustering calls", () => {
  beforeEach(() => {
    generateStructured.mockReset();
  });

  it("sends one call per batch and merges what comes back", async () => {
    generateStructured.mockImplementation(async (call: { prompt: string }) => ({
      themes: [
        {
          label: "Pricing",
          summary: "Too expensive",
          leadIds: [...call.prompt.matchAll(/id: (lead-\d+)/g)].map((match) => match[1]),
        },
      ],
    }));
    const items = leadsNamed(THEME_BATCH_SIZE + 1);
    const themes = await clusterLeads("project-1", items);
    expect(generateStructured).toHaveBeenCalledTimes(2);
    expect(generateStructured.mock.calls[0][0].purpose).toBe("insights");
    expect(themes).toHaveLength(1);
    expect(themes[0].leadIds).toHaveLength(items.length);
  });

  it("asks nothing when there is nothing to group", async () => {
    expect(await clusterLeads("project-1", [])).toEqual([]);
    expect(generateStructured).not.toHaveBeenCalled();
  });
});
