# Reddit Leads

A Reddit buyer-intent finder you can self-host for free. It scores Reddit posts and comments
against your product, tells you why each one scored what it did, and shows what the data for
every lead cost, down to the request.

Data comes from [AnyAPI](https://getanyapi.com): one key, pay per request in USD, no
subscription. "Premium" here means connecting your own AnyAPI wallet, not paying us a monthly
fee. Self-hosting has no limits at all.

This repository is at layer 1: the shell, the database, sign-in and wallet connect. Scanning,
scoring and the feed land in the next layer.

## Five-minute self-host

You need Docker, a free [Clerk](https://clerk.com) application for sign-in, and an
[AnyAPI](https://getanyapi.com) key.

```bash
git clone <this repository> reddit-leads
cd reddit-leads
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # APP_ENCRYPTION_KEY
```

Put that key in `APP_ENCRYPTION_KEY`, paste your two Clerk keys and your AnyAPI key into `.env`,
then:

```bash
docker compose up
```

The app applies its own migrations on start and serves on <http://localhost:3000>. Sign up,
and you are in.

To let people connect their own AnyAPI wallet instead of using your key, register this instance
as an OAuth client once and paste the printed id into `ANYAPI_OAUTH_CLIENT_ID`:

```bash
npm run anyapi:register
```

## Environment

| Variable | Required | Default | What it does |
|---|---|---|---|
| `DATABASE_URL` | yes | - | Postgres connection string. Compose sets it for you. |
| `APP_URL` | yes | `http://localhost:3000` | Public origin. Must match the registered OAuth redirect. |
| `APP_ENCRYPTION_KEY` | yes | - | 32 random bytes, base64. Encrypts stored AnyAPI refresh tokens. |
| `SELF_HOSTED` | no | `false` | `true` removes every tier limit. |
| `RUN_SCHEDULER` | no | `false` | `true` on exactly one process runs the every-minute job tick. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | yes | - | Clerk publishable key. |
| `CLERK_SECRET_KEY` | yes | - | Clerk secret key. |
| `ANYAPI_BASE_URL` | no | `https://api.getanyapi.com` | AnyAPI gateway. |
| `ANYAPI_OAUTH_CLIENT_ID` | no | - | Printed by `npm run anyapi:register`. Needed for wallet connect. |
| `ANYAPI_HOUSE_API_KEY` | no | - | The key used when a user has not connected a wallet. |
| `OPENROUTER_API_KEY` | no | - | Pays for scoring, drafting and clustering. |
| `OPENROUTER_MODEL` | no | `meta/muse-spark-1.3-contributor` | Override the model. |
| `RESEND_API_KEY` | no | - | Email digests. |
| `HOUSE_DATA_CAP_USD_PER_DAY` | no | `25` | Daily ceiling on data spend from the house key. |
| `HOUSE_LLM_CAP_USD_PER_DAY` | no | `10` | Daily ceiling on LLM spend. |

## How a wallet connection works

Sign in, open Settings, and press Connect AnyAPI wallet. You land on the AnyAPI consent screen,
where you set the spend cap this app may use, and come back connected. This app never sees or
stores an AnyAPI key: it holds a refresh token, encrypted with `APP_ENCRYPTION_KEY`, and swaps it
for a short-lived access token when it needs to make a call. Disconnect deletes the token here
and revokes it at AnyAPI.

Connecting a wallet buys freshness and breadth, not features: hourly scans instead of six-hourly,
unlimited keywords, subreddits and projects, comment scanning on every thread over your threshold,
and daily Reddit SEO refreshes with search volume. Everything else is on in every tier.

## Data we store, and for how long

Reddit posts and comments are public facts, so they are stored once and shared across projects:
two people tracking the same keyword pay for one fetch between them, and the Data usage screen
shows fetched versus reused honestly. Scores are never shared; the same post can be a 92 for one
product and a 12 for another. Shared Reddit rows are deleted 30 days after they were posted,
along with the leads pointing at them, which is also the feed window.

## What this is not

Deliberately absent, and not planned:

- **No posting.** No comment or DM is ever sent for you. Drafts have a Copy button.
- **No browser extension.**
- **No conversation inbox.** Once you reply, the conversation belongs to Reddit.
- **No feedback loop that rewrites your filters.** Marking a lead as not a fit records the
  reason and shows it in Insights; it does not silently change what you see next.
- **No archive of Reddit.** Search is the index. We keep 30 days and no more.

## Development

```bash
npm install
docker compose up -d postgres
cp .env.example .env    # fill in the keys, point DATABASE_URL at localhost:5433
npm run db:migrate
npm run dev
```

`npm run check` runs the typecheck, the linter and the unit tests. `npm run db:generate` writes a
new migration after a schema change.

## Licence

MIT.
