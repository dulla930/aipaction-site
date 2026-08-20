# aipaction.org — site guide

Static site. No build step, no server, no database. Six pages plus `batch.html` (the internal card factory) and three files in `assets/`. Everything you'll ever need to edit is in **`assets/data.js`**.

## Deploy — GitHub + Cloudflare Pages (free, auto-updating)

1. Create a GitHub repo (e.g. `aipaction-site`), push this folder to it.
2. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → pick the repo. Framework preset: **None**. Build command: (leave empty). Output directory: `/`.
3. In the Pages project → Custom domains → add `aipaction.org` (your DNS is already on Cloudflare if the domain is there; otherwise point the nameservers).
4. Done. Every push to `main` deploys automatically in ~30 seconds.

## Automation — quarterly FEC refresh

`.github/workflows/update-data.yml` runs on the 16th of Jan/Apr/Jul/Oct (the day after FEC quarterly deadlines) and opens a pull request with refreshed numbers plus a per-member diff report. Merging the PR deploys it. One-time setup is documented at the top of that file and in `tools/fec_pipeline.py` (get a free FEC API key, run `--resolve` once, review the committee list).

Never merge a refresh without glancing at the diff — these are claims about named politicians.

## Before launch — fill in `assets/data.js` → `config`

- `xUrl`, `igUrl`, `ttUrl` — your real handles.
- `email` — your contact address (set up on your domain or use a forwarder).
- `beehiivEmbedUrl` — create a free beehiiv publication, Settings → Embed, paste the embeds.beehiiv.com URL here. Every subscribe form on the site becomes the beehiiv embed. Until then the forms fall back to opening an email to you.
- `donateUrl` — paste any payment link (Stripe Payment Link, Givebutter, etc.). Until then the Donate button shows a "coming soon" note. Heads up: political donations can carry compliance requirements depending on how AIP is structured; worth a quick check before turning this on.

## Updating the money database

Open `assets/data.js`, add or edit rows in `members`:

```js
["Firstname Lastname","R","WI","WI-05", 123456],      // normal entry
["Firstname Lastname","D","WA","WA-07", 0, 1],        // refuses lobby money
["Firstname Lastname","D","VT","SEN", null],          // no total listed yet
```

Ranks, counts, search, sorting, and the share cards all update automatically. Missing right now: WA (House), WI, WV, WY.

Data source: FEC filings, career totals (as of July 5, 2026). When you refresh numbers, update the `asOf` date in `meta` too. Never add a number you can't source.

## Share cards

On The Money page, every row has a **Card** button that renders a 1080×1350 PNG (name, party, seat, career total, rank, methodology line, aipaction.com branding) — sized for Instagram feed, X, and TikTok slides. This is how you get "hundreds of graphics" for free: they're generated from the data, not designed one at a time.

Batch idea: open the database, filter to a state, and download the top 10 cards — that's a week of content per state.

## Files

- `index.html` — home: hook, three sourced stats, top-10 table, email capture
- `the-money.html` — the database + card generator
- `the-case.html` — the sourced argument (10 numbered sources)
- `receipts.html` — original research (Dunlap FEC audit is live)
- `about.html` — mission, methods, principles
- `take-action.html` — call script, share, follow, donate
- `assets/data.js` — ALL config + data (edit this one)
- `assets/style.css` — design system
- `assets/site.js` — nav/footer, database logic, card generator
