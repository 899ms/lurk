import { describe, expect, it, vi } from "vitest";
import { JUDGEMENT_SYSTEM } from "@/lib/prompts";
import {
  TRIAGE_BATCH_SIZE,
  engagementScore,
  foldScore,
  hydrationCap,
  retrievalBudgets,
} from "@/lib/scan/constants";
import { BODY_CHAR_BUDGET, describeItem, truncateBody } from "@/lib/scan/evidence";
import { judge, routeLead } from "@/lib/scan/gates";
import type { Assessment, ScorableItem, TriageItem } from "@/lib/scan/judgement";
import { retentionCutoff } from "@/lib/retention";
import { TIERS } from "@/lib/tiers";

const generateStructured = vi.fn();

vi.mock("@/lib/llm", () => ({ generateStructured }));

const { judgeItems, readOrder, triageTitles } = await import("@/lib/scan/score");

const item: ScorableItem = {
  id: "p1",
  title: "Looking for a form tool with logic, payments and webhooks",
  subreddit: "SaaS",
  body: "Our signup form needs conditional logic and it has to take payments.",
  author: "asker",
  ageHours: 5,
  upvotes: 4,
  numComments: 2,
  parentBody: null,
};

function assessment(patch: Partial<Assessment> = {}): Assessment {
  return {
    id: "p1",
    relationship: "buyer",
    needState: "open",
    fit: 4,
    intent: 3,
    stage: "solution_seeking",
    decision: "qualify",
    reasonCode: "supported_open_need",
    needEvidence: { quote: "it has to take payments" },
    reason: "Wants a form that takes payments.",
    ...patch,
  };
}

describe("score folding", () => {
  it("weights a point of fit or intent at twice a point of liveliness", () => {
    expect(foldScore(4, 4, 4)).toBe(100);
    expect(foldScore(4, 2, 0)).toBe(foldScore(3, 2, 2));
    expect(foldScore(3, 3, 0)).toBeGreaterThan(foldScore(3, 2, 1));
  });

  it("starts the qualified band at 50 and counts a missing scale as zero", () => {
    expect(foldScore(3, 2, 0)).toBe(50);
    expect(foldScore(null, null, 0)).toBe(0);
  });
});

describe("engagement", () => {
  it("is computed from age and replies, never asked of the model", () => {
    expect(engagementScore(1, 0)).toBe(4);
    expect(engagementScore(200, 40)).toBe(0);
    expect(engagementScore(30, 3)).toBe(2);
  });
});

describe("the qualification gates", () => {
  it("does not let a live thread and top intent pay for a wrong-job fit", () => {
    const judged = judge(assessment({ fit: 0, intent: 4 }), { ...item, ageHours: 1, numComments: 0 });
    expect(judged.engagement).toBe(4);
    expect(judged.score).toBeGreaterThan(50);
    expect(judged.decision).toBe("reject");
    expect(judged.reasonCode).toBe("wrong_job");
  });

  it("does not qualify a need the person says is resolved", () => {
    const judged = judge(assessment({ needState: "resolved" }), item);
    expect(judged.decision).toBe("reject");
    expect(judged.reasonCode).toBe("resolved");
  });

  it("treats a helper as neither a seller nor a lead", () => {
    const judged = judge(assessment({ relationship: "helper" }), item);
    expect(judged.sellerSide).toBe(false);
    expect(judged.decision).toBe("reject");
    expect(judged.reasonCode).toBe("helper_only");
  });

  it("rejects on each settled disqualifier, and names it", () => {
    const settled = [
      [{ relationship: "seller" as const }, "seller_only"],
      [{ relationship: "helper" as const }, "helper_only"],
      [{ needState: "resolved" as const }, "resolved"],
      [{ needState: "no_active_need" as const }, "no_active_need"],
      [{ fit: 0 }, "wrong_job"],
      [
        { relationship: "unknown" as const, needState: "unknown" as const, fit: null },
        "insufficient_evidence",
      ],
    ] as const;
    for (const [patch, code] of settled) {
      const judged = judge(assessment(patch), item);
      expect([patch, judged.decision]).toEqual([patch, "reject"]);
      expect(judged.reasonCode).toBe(code);
    }
  });

  it("holds a model rejection with no settled disqualifier behind it for review", () => {
    const judged = judge(assessment({ decision: "reject", reasonCode: "wrong_audience" }), item);
    expect(judged.decision).toBe("review");
  });

  it("holds category overlap alone for review rather than rejecting the person", () => {
    const judged = judge(assessment({ fit: 1, intent: 4 }), item);
    expect(judged.decision).toBe("review");
    expect(judged.reasonCode).toBe("wrong_audience");
  });

  it("qualifies a buyer whose open need the product covers", () => {
    const judged = judge(assessment(), item);
    expect(judged.decision).toBe("qualify");
    expect(judged.matchedPhrase).toBe("it has to take payments");
  });

  it("rejects an item the model could read nothing at all into", () => {
    const judged = judge(
      assessment({
        relationship: "unknown",
        needState: "unknown",
        fit: null,
        intent: 0,
        decision: "review",
        reasonCode: "insufficient_evidence",
        needEvidence: null,
      }),
      item,
    );
    expect(judged.decision).toBe("reject");
    expect(judged.reasonCode).toBe("insufficient_evidence");
  });

  it("rejects a person it cannot place once their need or fit is settled anyway", () => {
    for (const patch of [
      { relationship: "unknown" as const, needState: "no_active_need" as const, fit: 0 },
      { relationship: "unknown" as const, needState: "open" as const, fit: 0 },
    ]) {
      const judged = judge(
        assessment({ ...patch, decision: "review", reasonCode: "insufficient_evidence" }),
        item,
      );
      expect(judged.decision).toBe("reject");
    }
  });

  it("still holds a plausible buyer with one material unknown for review", () => {
    for (const patch of [
      { relationship: "buyer" as const, needState: "unknown" as const, fit: null },
      { relationship: "unknown" as const, needState: "evaluating" as const, fit: null },
      { relationship: "unknown" as const, needState: "unknown" as const, fit: 2 },
      { relationship: "discussion" as const, needState: "unknown" as const, fit: null },
    ]) {
      const judged = judge(assessment({ ...patch, decision: "review" }), item);
      expect(judged.decision).toBe("review");
    }
  });
});

describe("routing a judgement to a lane", () => {
  it("sends a buyer whose open need the product covers to the buyer lane", () => {
    expect(routeLead(assessment())).toBe("buyer");
  });

  it("keeps a helper as context when the product plainly does the job", () => {
    expect(routeLead(assessment({ relationship: "helper", fit: 3 }))).toBe("context");
  });

  it("drops a helper the product does not do the job for", () => {
    expect(routeLead(assessment({ relationship: "helper", fit: 1 }))).toBeNull();
  });

  it("drops a need the person says is already met, however good the fit", () => {
    expect(routeLead(assessment({ needState: "resolved", fit: 4 }))).toBeNull();
  });
});

describe("content Reddit has taken away", () => {
  const deletedBody: ScorableItem = { ...item, id: "gone", body: "[deleted]" };
  const removedBody: ScorableItem = { ...item, id: "removed", body: "  [Removed]  " };
  const deletedAuthor: ScorableItem = { ...item, id: "ghost", author: "[deleted]" };

  it("never sends a sentinel body or a deleted author to the model", async () => {
    generateStructured.mockReset();
    generateStructured.mockResolvedValueOnce({ items: [assessment()] });
    const judged = await judgeItems("project-1", "A form builder", [
      item,
      deletedBody,
      removedBody,
      deletedAuthor,
    ]);
    expect(generateStructured).toHaveBeenCalledTimes(1);
    const prompt = generateStructured.mock.calls[0][0].prompt;
    for (const id of ["gone", "removed", "ghost"]) {
      expect(prompt).not.toContain(`id: ${id}`);
    }
    expect(judged.map((one) => one.id)).toEqual(["p1"]);
  });

  it("makes no model call at all when every candidate is a sentinel", async () => {
    generateStructured.mockReset();
    const judged = await judgeItems("project-1", "A form builder", [deletedBody, deletedAuthor]);
    expect(generateStructured).not.toHaveBeenCalled();
    expect(judged).toEqual([]);
  });
});

describe("judging a batch", () => {
  it("drops a judgement for an id that was never in the batch", async () => {
    generateStructured.mockReset();
    generateStructured.mockResolvedValueOnce({
      items: [assessment(), assessment({ id: "not_ours" })],
    });
    generateStructured.mockResolvedValueOnce({ items: [] });
    const judged = await judgeItems("project-1", "A form builder", [item]);
    expect(judged.map((one) => one.id)).toEqual(["p1"]);
    expect(generateStructured.mock.calls[0][0].system).toBe(JUDGEMENT_SYSTEM);
  });

  it("asks once more for an id the model skipped, and never treats it as rejected", async () => {
    generateStructured.mockReset();
    generateStructured.mockResolvedValueOnce({ items: [assessment()] });
    generateStructured.mockResolvedValueOnce({ items: [assessment({ id: "p2" })] });
    const judged = await judgeItems("project-1", "A form builder", [item, { ...item, id: "p2" }]);
    expect(generateStructured).toHaveBeenCalledTimes(2);
    expect(generateStructured.mock.calls[1][0].prompt).toContain("id: p2");
    expect(generateStructured.mock.calls[1][0].prompt).not.toContain("id: p1\n");
    expect(judged.map((one) => one.id).sort()).toEqual(["p1", "p2"]);
  });

  it("leaves an id the model skipped twice unevaluated rather than rejected", async () => {
    generateStructured.mockReset();
    generateStructured.mockResolvedValueOnce({ items: [] });
    generateStructured.mockResolvedValueOnce({ items: [] });
    const judged = await judgeItems("project-1", "A form builder", [item]);
    expect(judged).toEqual([]);
  });

  it("shows the model plain typography, so a curly apostrophe cannot be garbled back", () => {
    const curly: ScorableItem = {
      ...item,
      title: "Hotels that \u201Callow\u201D 18 \u2013 cheap?",
      body: "some that wouldn\u2019t cost that much\u2026 \u0019ok",
    };
    const shown = describeItem(curly);
    expect(shown).toContain('title: Hotels that "allow" 18 - cheap?');
    expect(shown).toContain("target text: some that wouldn't cost that much... ok");
    expect(shown).not.toMatch(/[\u2018\u2019\u201C\u201D\u2013\u2026\u0019]/);
  });

  it("keeps a lead whose quote differs from the text only in typography", async () => {
    const typography: ScorableItem = {
      ...item,
      body: "Our signup form needs\n\n  conditional logic \u2013 and it\u2019s got to take \\*payments\\*.",
    };
    generateStructured.mockReset();
    generateStructured.mockResolvedValueOnce({
      items: [
        assessment({
          needEvidence: { quote: "conditional logic - and it's got to take *payments*." },
        }),
      ],
    });
    const judged = await judgeItems("project-1", "A form builder", [typography]);
    expect(judged[0].decision).toBe("qualify");
    expect(judged[0].reasonCode).not.toBe("insufficient_evidence");
  });

  it("keeps a lead whose quote the head-and-tail excerpt cut in half", async () => {
    const long: ScorableItem = {
      ...item,
      body: `${"a".repeat(BODY_CHAR_BUDGET)} we need webhooks on every submission. ${"b".repeat(BODY_CHAR_BUDGET)}`,
    };
    generateStructured.mockReset();
    generateStructured.mockResolvedValueOnce({
      items: [assessment({ needEvidence: { quote: "we need webhooks on every submission." } })],
    });
    const judged = await judgeItems("project-1", "A form builder", [long]);
    expect(describeItem(long)).not.toContain("we need webhooks on every submission.");
    expect(judged[0].decision).toBe("qualify");
  });

  it("holds a commenter whose only quote comes from the post they are answering", async () => {
    const commenter: ScorableItem = {
      ...item,
      id: "c1",
      body: "Same boat here, following this thread.",
      parentBody: "Our signup form needs conditional logic and it has to take payments.",
    };
    generateStructured.mockReset();
    generateStructured.mockResolvedValueOnce({
      items: [
        assessment({
          id: "c1",
          needEvidence: { quote: "it has to take payments" },
        }),
      ],
    });
    generateStructured.mockResolvedValueOnce({ items: [] });
    const judged = await judgeItems("project-1", "A form builder", [commenter]);
    expect(describeItem(commenter)).toContain("it has to take payments");
    expect(judged[0].decision).toBe("review");
    expect(judged[0].reasonCode).toBe("insufficient_evidence");
  });

  it("sends a judgement whose quote is not in the supplied text to review", async () => {
    generateStructured.mockReset();
    generateStructured.mockResolvedValueOnce({
      items: [assessment({ needEvidence: { quote: "we have a budget of ten thousand" } })],
    });
    generateStructured.mockResolvedValueOnce({ items: [] });
    const judged = await judgeItems("project-1", "A form builder", [item]);
    expect(judged[0].decision).toBe("review");
    expect(judged[0].reasonCode).toBe("insufficient_evidence");
  });
});

describe("body truncation", () => {
  it("keeps the head and the tail, where the edit and the resolution live", () => {
    const body = `${"a".repeat(BODY_CHAR_BUDGET)}Edit: solved, we bought one.`;
    const kept = truncateBody(body);
    expect(kept.startsWith("aaaa")).toBe(true);
    expect(kept).toContain("Edit: solved, we bought one.");
    expect(kept.length).toBeLessThan(body.length);
  });

  it("leaves a short body alone", () => {
    expect(truncateBody("short")).toBe("short");
  });
});

describe("triage", () => {
  const candidates = [
    { id: "a", title: "A", subreddit: "SaaS", author: null, score: null, ageHours: 1 },
    { id: "b", title: "B", subreddit: "SaaS", author: null, score: null, ageHours: 1 },
    { id: "c", title: "C", subreddit: "SaaS", author: null, score: null, ageHours: 1 },
  ];

  it("keeps the model's order and priority, and never rejects a candidate it skipped", async () => {
    generateStructured.mockReset();
    generateStructured.mockResolvedValueOnce({
      items: [
        { id: "c", disposition: "read", priority: "medium", reasonCode: "relevant_pain", reason: "c" },
        { id: "b", disposition: "read", priority: "high", reasonCode: "explicit_ask", reason: "b" },
      ],
    });
    const triage = await triageTitles("project-1", "A form builder", candidates);
    expect(triage.map((one) => one.id)).toEqual(["c", "b", "a"]);
    expect(triage[2].disposition).toBe("uncertain");
    expect(readOrder(triage, new Map())).toEqual(["b", "c", "a"]);
  });

  it("reads more titles than one batch holds, keeping every id and the ranking", async () => {
    const many = Array.from({ length: TRIAGE_BATCH_SIZE + 5 }, (_, index) => ({
      id: `p${index}`,
      title: `Title ${index}`,
      subreddit: "SaaS",
      author: null,
      score: null,
      ageHours: 1,
    }));
    const verdict = (id: string, priority: "high" | "low") => ({
      id,
      disposition: "read" as const,
      priority,
      reasonCode: "relevant_pain" as const,
    });
    const last = `p${TRIAGE_BATCH_SIZE - 1}`;
    const first = `p${TRIAGE_BATCH_SIZE}`;
    generateStructured.mockReset();
    generateStructured.mockResolvedValueOnce({
      items: many
        .slice(0, TRIAGE_BATCH_SIZE)
        .map((one) => verdict(one.id, one.id === last ? "high" : "low")),
    });
    generateStructured.mockResolvedValueOnce({
      items: many
        .slice(TRIAGE_BATCH_SIZE)
        .map((one) => verdict(one.id, one.id === first ? "high" : "low")),
    });

    const triage = await triageTitles("project-1", "A form builder", many);

    expect(generateStructured).toHaveBeenCalledTimes(2);
    expect(generateStructured.mock.calls[0][0].prompt).toContain("Title 0");
    expect(generateStructured.mock.calls[0][0].prompt).not.toContain(`Title ${TRIAGE_BATCH_SIZE}`);
    expect(triage).toHaveLength(many.length);
    expect(new Set(triage.map((one) => one.id)).size).toBe(many.length);
    expect(triage.every((one) => one.disposition === "read")).toBe(true);
    const order = readOrder(triage, new Map());
    expect(order.slice(0, 2)).toEqual([last, first]);
    expect(order.slice(2)).toEqual(
      many.map((one) => one.id).filter((id) => id !== last && id !== first),
    );
  });

  it("reads the uncertain, never the rejected", () => {
    const triage: TriageItem[] = [
      { id: "a", disposition: "reject", priority: "high", reasonCode: "wrong_topic" },
      { id: "b", disposition: "uncertain", priority: "low", reasonCode: "insufficient_context" },
    ];
    expect(readOrder(triage, new Map())).toEqual(["b"]);
  });
});

describe("what one scan may buy", () => {
  it("opens no more posts than the tier's hydration budget", () => {
    expect(hydrationCap(TIERS.free)).toBe(TIERS.free.hydrationPerScan);
    expect(hydrationCap(TIERS.connected)).toBe(TIERS.connected.hydrationPerScan);
  });

  it("caps nothing for a self-hosted instance, which retrieves like a connected one", () => {
    expect(hydrationCap(null)).toBeNull();
    expect(retrievalBudgets(null)).toEqual(retrievalBudgets(TIERS.connected));
  });

  it("reads every budget from the tier", () => {
    expect(retrievalBudgets(TIERS.free)).toEqual({
      searches: TIERS.free.searchesPerScan,
      scoped: TIERS.free.scopedSearchesPerScan,
      listings: TIERS.free.listingPilotsPerScan,
      serpPerDay: TIERS.free.serpQueriesPerDay,
      pages: TIERS.free.searchPagesPerQuery,
    });
  });
});

describe("retention cutoff", () => {
  it("keeps exactly the feed window", () => {
    const now = new Date("2026-09-05T00:00:00Z");
    expect(retentionCutoff(now).toISOString()).toBe("2026-08-06T00:00:00.000Z");
  });

  it("matches the tier feed window", () => {
    const now = new Date("2026-09-05T00:00:00Z");
    const days = (now.getTime() - retentionCutoff(now).getTime()) / (24 * 60 * 60 * 1000);
    expect(days).toBe(TIERS.free.feedWindowDays);
  });
});
