import { describe, expect, it } from "vitest";
import { digestSubject, renderDigestHtml, renderDigestText } from "@/lib/alerts/digest";
import { payloadFor } from "@/lib/alerts/send";
import {
  CADENCE_MS,
  CHAT_LEAD_CAP,
  effectiveCadence,
  isDue,
  selectLeads,
  webhookAllowance,
  webhookCapText,
  type SelectableLead,
} from "@/lib/alerts/select";
import { normalizeTarget } from "@/lib/alerts/channels";
import type { Digest, DigestLead } from "@/lib/alerts/types";
import { TIERS } from "@/lib/tiers";

/** Local time on purpose: the timeline axis is drawn in the reader's hours. */
const NOW = new Date(2026, 8, 5, 9, 0, 0);
const SINCE = new Date(2026, 8, 5, 6, 0, 0);

function lead(overrides: Partial<SelectableLead> & { id: string }): SelectableLead {
  return {
    title: "Paying too much for a scraper",
    url: "https://www.reddit.com/r/SaaS/comments/x/",
    subreddit: "SaaS",
    author: "ella_builds",
    avatarUrl: null,
    score: 70,
    reason: "Names the tool and the price.",
    matchedPhrase: "paying too much",
    createdAt: new Date(2026, 8, 5, 7, 0, 0),
    status: "new",
    scoredAt: new Date(2026, 8, 5, 8, 0, 0),
    ...overrides,
  };
}

function digestOf(leads: DigestLead[]): Digest {
  return {
    projectName: "Acme",
    generatedAt: NOW,
    since: new Date(NOW.getTime() - CADENCE_MS.daily),
    cadence: "daily",
    leads,
    appUrl: "https://leads.example.com",
  };
}

describe("cadence", () => {
  it("holds a free channel to daily whatever it asked for", () => {
    expect(effectiveCadence("hourly", TIERS.free)).toBe("daily");
  });

  it("gives a connected wallet and a self-hosted instance what they asked", () => {
    expect(effectiveCadence("hourly", TIERS.connected)).toBe("hourly");
    expect(effectiveCadence("hourly", null)).toBe("hourly");
    expect(effectiveCadence("daily", TIERS.connected)).toBe("daily");
  });

  it("is due on the first run and once the cadence has elapsed", () => {
    expect(isDue(null, "daily", NOW)).toBe(true);
    expect(isDue(new Date(NOW.getTime() - CADENCE_MS.daily + 1000), "daily", NOW)).toBe(false);
    expect(isDue(new Date(NOW.getTime() - CADENCE_MS.daily), "daily", NOW)).toBe(true);
    expect(isDue(new Date(NOW.getTime() - CADENCE_MS.hourly), "hourly", NOW)).toBe(true);
  });
});

describe("what one message carries", () => {
  const since = SINCE;

  it("takes only new leads scored inside the window, best first", () => {
    const rows = [
      lead({ id: "old", scoredAt: new Date(2026, 8, 5, 5, 0, 0), score: 99 }),
      lead({ id: "hidden", status: "hidden", score: 98 }),
      lead({ id: "low", score: 61 }),
      lead({ id: "high", score: 88 }),
    ];
    expect(selectLeads(rows, since, null).map((one) => one.id)).toEqual(["high", "low"]);
  });

  it("caps a chat channel at the top five and leaves email uncapped", () => {
    const rows = Array.from({ length: 8 }, (_, index) =>
      lead({ id: `l${index}`, score: 90 - index }),
    );
    expect(selectLeads(rows, since, CHAT_LEAD_CAP)).toHaveLength(CHAT_LEAD_CAP);
    expect(selectLeads(rows, since, null)).toHaveLength(8);
  });

  it("hands back digest leads without the selection columns", () => {
    const [only] = selectLeads([lead({ id: "a" })], since, null);
    expect(only).not.toHaveProperty("status");
    expect(only).not.toHaveProperty("scoredAt");
  });
});

describe("webhook allowance", () => {
  it("counts webhooks and not email against the free cap", () => {
    expect(webhookAllowance(["email"], TIERS.free)).toMatchObject({ used: 0, atCap: false });
    expect(webhookAllowance(["email", "slack"], TIERS.free)).toMatchObject({
      used: 1,
      atCap: true,
    });
    expect(webhookCapText(["email", "slack"], TIERS.free)).toBe("1 of 1 webhooks");
  });

  it("caps nothing for a connected wallet or a self-hosted instance", () => {
    expect(webhookAllowance(["slack", "discord"], TIERS.connected).atCap).toBe(false);
    expect(webhookCapText(["slack"], null)).toBeNull();
  });
});

describe("targets", () => {
  it("takes the hosts Slack and Discord actually publish", () => {
    expect(normalizeTarget("slack", " https://hooks.slack.com/services/T/B/x ")).toBe(
      "https://hooks.slack.com/services/T/B/x",
    );
    expect(normalizeTarget("discord", "https://discord.com/api/webhooks/1/x")).toBe(
      "https://discord.com/api/webhooks/1/x",
    );
    expect(normalizeTarget("webhook", "https://example.com/hooks")).toBe(
      "https://example.com/hooks",
    );
    expect(normalizeTarget("email", "you@company.com")).toBe("you@company.com");
  });

  it("refuses an address that cannot be that channel", () => {
    expect(() => normalizeTarget("slack", "https://example.com/x")).toThrow(/hooks.slack.com/);
    expect(() => normalizeTarget("discord", "https://example.com/x")).toThrow(/discord.com/);
    expect(() => normalizeTarget("email", "not-an-address")).toThrow(/email address/);
  });
});

describe("chat payloads", () => {
  it("puts the headline and every lead in the Slack blocks", () => {
    const payload = payloadFor("slack", digestOf(selectLeads([lead({ id: "a" })], SINCE, null)));
    expect(payload).toMatchObject({ text: "1 new lead for Acme in the last 24 hours." });
    expect(JSON.stringify(payload)).toContain("https://www.reddit.com/r/SaaS/comments/x/");
  });

  it("gives Discord one embed per lead with the score and subreddit", () => {
    const payload = payloadFor("discord", digestOf(selectLeads([lead({ id: "a" })], SINCE, null)));
    expect(payload).toMatchObject({
      embeds: [
        {
          title: "Paying too much for a scraper",
          fields: [
            { name: "Score", value: "70" },
            { name: "Subreddit", value: "r/SaaS" },
          ],
        },
      ],
    });
  });

  it("hands a generic endpoint the digest unstyled", () => {
    const payload = payloadFor("webhook", digestOf(selectLeads([lead({ id: "a" })], SINCE, null)));
    expect(payload).toMatchObject({ project: "Acme", cadence: "daily" });
  });
});

/** Tag names in document order, so the snapshot is the table structure only. */
function structure(html: string): string {
  return (html.match(/<\/?[a-z!][a-z0-9]*/gi) ?? [])
    .map((tag) => tag.replace("<", ""))
    .join(" ");
}

describe("the digest email", () => {
  const html = renderDigestHtml(digestOf(selectLeads([lead({ id: "a" })], SINCE, null)));

  it("names the project and the count in the subject", () => {
    expect(digestSubject(digestOf([]))).toBe("0 new leads for Acme");
    expect(digestSubject(digestOf(selectLeads([lead({ id: "a" })], SINCE, null)))).toBe(
      "1 new lead for Acme",
    );
  });

  it("carries the headline, the author, the phrase and a source link", () => {
    expect(html).toContain("1 new lead for Acme in the last 24 hours.");
    expect(html).toContain("u/ella_builds");
    expect(html).toContain("r/SaaS");
    expect(html).toContain("paying too much");
    expect(html).toContain('<a href="https://www.reddit.com/r/SaaS/comments/x/"');
    expect(html).toContain("Source");
  });

  it("stays email safe: tables, inline styles, no stylesheet or class", () => {
    expect(html).not.toContain("<style");
    expect(html).not.toContain("class=");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("oklch");
    expect(html).toContain('role="presentation"');
  });

  it("draws one timeline column per hour from midnight to now", () => {
    const columns = (html.match(/valign="bottom"/g) ?? []).length;
    expect(columns).toBe(NOW.getHours() + 1);
  });

  it("escapes what a Reddit title can contain", () => {
    const nasty = renderDigestHtml(
      digestOf(selectLeads([lead({ id: "a", title: '<script>"x"</script>' })], SINCE, null)),
    );
    expect(nasty).not.toContain("<script>");
    expect(nasty).toContain("&lt;script&gt;");
  });

  it("keeps the same table structure", () => {
    expect(structure(html)).toMatchInlineSnapshot(`"!doctype html head meta meta title /title /head body table tr td table tr td table tr td img /td td /td /tr /table /td /tr tr td /td /tr tr td table tr td /td /tr tr td table tr td div /div div /div /td td div /div div /div /td td div /div div /div /td td div /div div /div /td td div /div div /div /td td div /div div /div /td td div /div div /div /td td div div /div /div div /div div /div /td td div /div div /div /td td div /div div /div /td /tr /table /td /tr /table /td /tr tr td table tr td div /div img /td td div /div div /div div /div div /div /td td div /div a /a /td /tr /table /td /tr tr td a /a a /a /td /tr /table /td /tr /table /body /html"`);
  });

  it("says plainly when nothing came in", () => {
    const quiet = renderDigestHtml(digestOf([]));
    expect(quiet).toContain("Nothing new in the last 24 hours.");
    expect(renderDigestText(digestOf([]))).toContain("0 new leads for Acme");
  });
});
