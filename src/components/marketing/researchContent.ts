/** Saved SEO/insights/competitor records from read-only Postgres, Round 3.
 * Ages are at the saved observation, not a claim of current Google rankings.
 * Repo tree generated from git ls-files, top two levels; no untracked secrets. */
export const SEO_THREADS = [
  {
    keyword: "Typeform alternatives",
    title: "Typeform Alternative",
    url: "https://www.reddit.com/r/Entrepreneur/comments/vyf9yd/typeform_alternative/",
    position: 1,
    subreddit: "Entrepreneur",
    icon: "https://styles.redditmedia.com/t5_2qldo/styles/communityIcon_vbw2fy8csgz01.png?width=64&frame=1&auto=webp&s=f9d09673d8d4331f2bb74fc5ed05eb49110bc790",
    comments: 205,
    date: "2022-07-13",
    ageDays: 1515,
    observed: "2026-09-06",
    competitorPresent: true,
    competitor: "Typeform",
    domain: "typeform.com",
  },
  {
    keyword: "Typeform alternatives",
    title: "Free typeform alternative?",
    url: "https://www.reddit.com/r/Entrepreneur/comments/1d11f7a/free_typeform_alternative/",
    position: 2,
    subreddit: "Entrepreneur",
    icon: "https://styles.redditmedia.com/t5_2qldo/styles/communityIcon_vbw2fy8csgz01.png?width=64&frame=1&auto=webp&s=f9d09673d8d4331f2bb74fc5ed05eb49110bc790",
    comments: 131,
    date: "2024-05-26",
    ageDays: 832,
    observed: "2026-09-06",
    competitorPresent: true,
    competitor: "Typeform",
    domain: "typeform.com",
  },
];
export const SCAN_MISSES = [
  {
    id: "1w8fxcc",
    title:
      "Sanity check for beginner: Budget Dual RTX 3060 12GB build for Qwen 3.8",
    subreddit: "selfhosted",
  },
  {
    id: "1w8bcly",
    title: "Meals I enjoy and usually make weekly to keep on budget",
    subreddit: "Frugal",
  },
];
export const SAVED_THEMES = [
  {
    label: "Simpler Alternative To Jotform",
    summary:
      "They find Jotform overkill for basic surveys and asked for a simpler tool non-technical staff can manage.",
    leads: 2,
  },
  {
    label: "Repetitive Training Feedback Forms",
    summary:
      "They waste time rebuilding training feedback forms after every session and asked for an AI builder that generates editable questions from a doc.",
    leads: 1,
  },
];

/** Counted over every saved competitor_mentions row on 2026-09-06. */
export const MENTION_TALLY = {
  observed: "2026-09-06",
  total: 21,
  negative: 1,
  competitors: [
    { name: "Jotform", domain: "jotform.com", mentions: 7 },
    { name: "Typeform", domain: "typeform.com", mentions: 7 },
    { name: "Google Forms", domain: "forms.google.com", mentions: 7 },
  ],
};
export const REPO_TREE =
  ".dockerignore\n.env.example\n.github/\n  workflows/\n.gitignore\nDockerfile\nLICENSE\nREADME.md\ncomponents.json\ndocker-compose.yml\ndocker-entrypoint.sh\ndrizzle/\n  0000_vengeful_wallow.sql\n  0001_overconfident_goliath.sql\n  0002_handy_cable.sql\n  0003_nosy_jamie_braddock.sql\n  0004_sudden_kitty_pryde.sql\n  meta/\ndrizzle.config.ts\neslint.config.mjs\nnext.config.ts\npackage-lock.json\npackage.json\npostcss.config.mjs\npublic/\n  agent-guide.md\n  anyapi-mark.svg\n  brands/\n  openapi.json\nscripts/\n  azure-github-oidc.sh\n  azure-provision.sh\n  register-oauth-client.ts\n  write-brand-marks.mjs\nsrc/\n  app/\n  components/\n  db/\n  instrumentation.ts\n  jobs/\n  lib/\n  proxy.ts\n  styles/\ntests/\n  alerts.test.ts\n  api.test.ts\n  competitors.test.ts\n  crypto.test.ts\n  drafts.test.ts\n  fetchShared.test.ts\n  insights.test.ts\n  oauth.test.ts\n  scan.test.ts\n  seo.test.ts\n  tiers.test.ts\ntsconfig.json\nvitest.config.ts";
export const REPO_URL = "https://github.com/getanyapi-com/lurk";
