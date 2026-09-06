import { describe, expect, it, vi } from "vitest";
import { withoutKnownLeads, leadKey } from "@/lib/scan/leads";
import { JUDGEMENT_SYSTEM } from "@/lib/prompts";
import {
  MAX_POST_READS_FREE,
  engagementScore,
  foldScore,
  postReadCap,
} from "@/lib/scan/constants";
import { BODY_CHAR_BUDGET, truncateBody } from "@/lib/scan/evidence";
import { judge } from "@/lib/scan/gates";
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
    requirements: [],
    answerCoverage: "none",
    unansweredAngle: null,
    decision: "qualify",
    reasonCodes: ["supported_open_need"],
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
    const judged = judge(assessment({ fit: 1, intent: 4 }), { ...item, ageHours: 1, numComments: 0 });
    expect(judged.engagement).toBe(4);
    expect(judged.score).toBeGreaterThan(50);
    expect(judged.decision).toBe("reject");
    expect(judged.reasonCodes).toContain("wrong_job");
  });

  it("does not qualify a need the person says is resolved", () => {
    const judged = judge(assessment({ needState: "resolved" }), item);
    expect(judged.decision).toBe("reject");
    expect(judged.reasonCodes).toContain("resolved");
  });

  it("treats a helper as neither a seller nor a lead", () => {
    const judged = judge(assessment({ relationship: "helper" }), item);
    expect(judged.sellerSide).toBe(false);
    expect(judged.decision).toBe("reject");
    expect(judged.reasonCodes).toContain("helper_only");
  });

  it("rejects an unmet hard requirement the person named", () => {
    const judged = judge(
      assessment({
        requirements: [
          {
            requirement: "Kafka topic throughput alerts",
            importance: "hard",
            satisfaction: "unmet",
            targetEvidence: { quote: "it has to take payments" },
          },
        ],
      }),
      item,
    );
    expect(judged.decision).toBe("reject");
    expect(judged.reasonCodes).toContain("hard_requirement_mismatch");
  });

  it("qualifies a buyer whose open need the product covers", () => {
    const judged = judge(assessment(), item);
    expect(judged.decision).toBe("qualify");
    expect(judged.matchedPhrase).toBe("it has to take payments");
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

  it("sends a judgement whose quote is not in the supplied text to review", async () => {
    generateStructured.mockReset();
    generateStructured.mockResolvedValueOnce({
      items: [assessment({ needEvidence: { quote: "we have a budget of ten thousand" } })],
    });
    generateStructured.mockResolvedValueOnce({ items: [] });
    const judged = await judgeItems("project-1", "A form builder", [item]);
    expect(judged[0].decision).toBe("review");
    expect(judged[0].reasonCodes).toContain("insufficient_evidence");
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
    expect(readOrder(triage)).toEqual(["b", "c", "a"]);
  });

  it("reads the uncertain, never the rejected", () => {
    const triage: TriageItem[] = [
      { id: "a", disposition: "reject", priority: "high", reasonCode: "wrong_topic", reason: "a" },
      { id: "b", disposition: "uncertain", priority: "low", reasonCode: "insufficient_context", reason: "b" },
    ];
    expect(readOrder(triage)).toEqual(["b"]);
  });
});

describe("post read cap", () => {
  it("reads three posts per comment thread the tier allows", () => {
    expect(postReadCap({ ...TIERS.free, commentThreadsPerScan: 10 }, "free")).toBe(30);
  });

  it("never reads more than the free ceiling", () => {
    expect(postReadCap(TIERS.free, "free")).toBe(MAX_POST_READS_FREE);
    expect(postReadCap({ ...TIERS.free, commentThreadsPerScan: 100 }, "free")).toBe(
      MAX_POST_READS_FREE,
    );
  });

  it("caps nothing for a connected wallet or a self-hosted instance", () => {
    expect(postReadCap(TIERS.connected, "connected")).toBeNull();
    expect(postReadCap(null, "free")).toBeNull();
  });
});

describe("lead dedupe", () => {
  it("drops a post the project already judged", () => {
    const known = new Set([leadKey("abc", null)]);
    const kept = withoutKnownLeads(known, [{ postId: "abc" }, { postId: "def" }]);
    expect(kept.map((entry) => entry.postId)).toEqual(["def"]);
  });

  it("keeps a comment on a post that is already a lead", () => {
    const known = new Set([leadKey("abc", null)]);
    const kept = withoutKnownLeads(known, [{ postId: "abc", commentId: "c1" }]);
    expect(kept).toHaveLength(1);
  });

  it("drops a duplicate inside one batch", () => {
    const kept = withoutKnownLeads(new Set(), [{ postId: "abc" }, { postId: "abc" }]);
    expect(kept).toHaveLength(1);
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
