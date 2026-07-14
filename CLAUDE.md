# GSY Fuel Prices — gsyfuel.co.uk

Live Guernsey fuel price tracker. **Production site, ~5k pageviews/month — do not break it.** Brad's dad updates prices weekly via the admin panel; the entire premise is a reliably updating price grid.

## Architecture
- Static site (plain HTML/JS, no build step) hosted on **Netlify**, auto-deployed from GitHub `youngdarb/Fuel-Prices` (main branch)
- **Primary domain: https://gsyfuel.co.uk** — gsyfuel.com, www variants, and gsyfuel.netlify.app all 301 to it (see `_redirects`)
- `prices.json` + `price-history.json` are the data. They are committed to GitHub by a serverless function, NOT via Netlify deploys
- `netlify.toml` has a build-ignore rule: commits touching only prices.json/price-history.json do NOT trigger Netlify builds (saves build credits — cancelled deploys for price commits are EXPECTED, not a bug)
- Public pages fetch prices from `raw.githubusercontent.com` (5-min CDN cache, acceptable for visitors)

## Critical: the raw CDN trap
`raw.githubusercontent.com` caches ~5 min and ignores query-string cache busters. **Never use it for read-after-write.** The admin panel loads prices via `/.netlify/functions/publish` with `action: 'get'` (GitHub Contents API, uncached). Breaking this reintroduces the worst bug this project has had (published prices appearing to "reset").

## Key files
- `index.html` — public page. Table + Leaflet map (fuel toggles: unleaded=green, diesel=blue, other=red; pins hidden when no price for selected fuel), Chart.js history, announcements banner + feed, advertise modal ("Your ad here" banners top/bottom), station grouping (stations sharing a `group` value collapse into one expandable row)
- `update-gsy-fuel.html` — admin panel. Password-gated (SHA-256 hash in file + `ADMIN_HASH` env var — they must match). Loads prices via the publish function; publish is BLOCKED if that load failed (prevents wiping data). Has announcements editor, price-report queue, group price apply
- `netlify/functions/publish.js` — verifies secret against `ADMIN_HASH`, commits prices.json + price-history.json to GitHub with `GH_TOKEN`; `action: 'get'` returns live prices.json
- `netlify/functions/reports.js` — lists/dismisses Netlify Forms price-report submissions using `NETLIFY_TOKEN` + `NETLIFY_SITE_ID`
- `_headers`, `_redirects`, `sitemap.xml`, `robots.txt`, `manifest.json`, `sw.js` (network-only SW — never add caching, prices must be live)

## Secrets (all in Netlify env vars, never in code)
`ADMIN_HASH`, `GH_TOKEN` (GitHub fine-grained, Contents RW on this repo), `NETLIFY_TOKEN`, `NETLIFY_SITE_ID`. If dad's publish breaks with 401/500, first suspects: expired GH_TOKEN or NETLIFY_TOKEN (Netlify password resets invalidate its PATs).

## Conventions & rules
- **Test before deploying.** Serve locally (PowerShell static server — no Python/Node on this machine) and exercise the map toggles, table, chart, announcements before pushing
- Always `git pull --rebase origin main` before pushing — the publish function commits to GitHub independently, local is often behind
- Verify deploys with `curl` against gsyfuel.co.uk (grep for the new change), not by assumption
- No UI redesigns unless asked. No em dashes in site copy. Copy should sound human, not AI
- Sort stations: cheapest unleaded first, diesel tiebreaker
- AdSense pub ID: ca-pub-5807886553089046 (ads.txt). Vignettes/ad-intents deliberately disabled — don't enable
- Forms: `advertise-enquiry` and `price-report` (Netlify Forms, honeypot-protected). Ad enquiries answered by Brad, ~£30/month banner rate

## In progress (July 2026)
- Google Play app: PWA is ready (manifest/sw/icons); TWA packaging via pwabuilder.com pending Brad's Play Console verification (12 testers × 14 days closed test required before production)
- Apple App Store: planned; needs Apple Developer enrolment ($99/yr) + GitHub Actions macOS build pipeline (no Mac available)
- First advertiser lead: The Pest Detective (reply pending)
