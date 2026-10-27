# Devpost submission pack

Copy for every Devpost field, in the order the form asks for it. Every number here comes from a committed file or a logged production run, and the source is listed next to it. `SUBMISSION.md` is the long reference; this file is what gets pasted.

Production when this was written: deploy50 on Oct 26, 2026 (health `gitSha` in `integration-head.txt`).

---

## Project name

LeaseUp

## Elevator pitch (under 200 characters)

> LeaseUp tells retail landlords and brokers which chains to pitch for an empty storefront, using Qloo taste data, real store footprints and a small agent that shows its work.

## Thumbnail

`docs/devpost/gallery/01-report-wicker.png` (3:2, 2880x1920).

---

## About the project

### Inspiration

When a storefront goes empty, the landlord or broker has to decide which retailers to call. The usual shortcut is to pitch big national chains, but a lot of those already have a store down the street, and chain size says nothing about whether a brand fits the people who shop on that block. We wanted a tool that answers two plain questions for one address: who is not here yet, and who would fit here. Qloo's taste data covers the second question. Open store data covers the first.

### What it does

You type a US storefront address and pick a trade area (2, 5 or 10 km). LeaseUp:

1. Scores 227 tracked retail chains against the location with Qloo's insights API.
2. Removes brands that already have a store in the trade area, using an All The Places snapshot and OpenStreetMap tiles.
3. Ranks the rest with a model fitted on a 40 address study, and explains each pick in one line.
4. Shows the map, who shops in the area (Qloo location tags), nearby tenants, and a vacancy cost calculator.
5. Lets you save brands to a pipeline, watch the space, share a read only pitch brief, and send the landlord an owner update link.

"Run full prospecting" does the whole job as an agent run. A gpt-4o-mini planner picks which checks to run under a fixed budget (at most 6 tool steps, 3 Qloo calls, 18 seconds). After ranking, a reviewer can move a brand up only when the evidence supports it, and every model decision is checked on the server against that rule. The run ends with an Agent receipt that lists only the steps the server actually logged, with JSON and Markdown export. Outreach emails are drafted for the broker to edit and send; nothing is ever sent automatically.

### How we built it

The frontend is React, Vite and MapLibre GL on Cloudflare Pages. The API is a Hono app on a Cloudflare Worker with D1 for jobs, pipeline and rate limits and KV for cached upstream responses. Everything runs on Cloudflare's free plan.

How Qloo is used:

* `GET /v2/insights` with brand entities at the geocoded point and radius, in batches of up to 45 brand IDs, across 227 chains. Calls happen only on the server.
* Location tag insights describe who shops in the trade area.
* Taste twins: the site's brand scores are compared with 40 recorded panel markets to find the 5 most similar, and each pitch says how many of those twins have the brand. This reuses the insights already fetched, so it costs no extra Qloo calls.
* The planner and the reviewer call Qloo through the same server tools, inside the same budget.

We were strict about measurement. Before tuning anything we ran a 40 address study with real Qloo data and checked store presence against ATP and OSM. Results (`packages/fixtures/src/eval/live-qloo-lift/aggregates.json`, `data/qloo-eval-40/`):

* Raw Qloo affinity put 0.54 of the top 10 brands among ones already trading nearby. Ranking by national chain size got 0.76. Our fitted blend of the two got 0.825, which is 6.5 points above chain size (95% interval 3.3 to 9.3).
* Among brands of similar size, Qloo separated present from absent with an AUC of 0.664 (95% interval 0.642 to 0.687). Inside the mid size tier, ordering by Qloo put 0.53 of the top 5 among brands already trading nearby, against 0.23 for ordering by size.
* The taste twin ranker, used on live addresses, raised top 10 hits from 8.2 to 9.0 out of 10 in a leave one site out test (`TWIN_RANK_EVAL.md`).
* The review rule lifts a brand only when its panel presence is within 10 points of the brand it displaces. Leave one market out, it added 0.200 top 5 hits per market (95% interval 0.025 to 0.375). A replay with gpt-4o-mini making the calls added 0.175 (interval 0 to 0.35). Honestly read, that is a small gain with a lower bound near zero.

Caveat: these numbers measure whether a brand already trades in similar places. They are not lease outcomes, and we say so in the app.

Testing: 361 worker tests and 192 web tests in Vitest, Playwright end to end tests (CSP, accessibility, Qloo down fallback, pipeline), Lighthouse CI (mobile median: landing performance 93, report performance 89, report accessibility 96), and CI checks that the numbers in our docs match the committed data.

### Challenges we ran into

* Raw Qloo affinity alone did worse than chain size on our study. We had to say that out loud and build a ranking that uses both, then show the chain size baseline in the app so anyone can compare.
* Cloudflare's free plan allows 50 subrequests per Worker invocation. A full agent run needs more than that, so we split work across invocations with a loopback service binding and added a meter. The meter caught live analyze at 57 counted subrequests; after the fix the same address measured 27. CI now fails if a budget is exceeded.
* On the night before submission, live runs showed gpt-4o-mini declining lifts the evidence supported and writing reasons with wrong arithmetic. We changed the server to check every model decision against the rule and show the server's numbers. A rule now overrules the model, and the app labels it when that happens.
* Dense cities make a fixed 10 km "already here" check meaningless, so the absence radius adapts to density with a 3 km floor.

### Accomplishments that we're proud of

* The headline numbers are measured, preregistered and reproducible from the repo, including the ones that did not flatter Qloo or our agent.
* The agent is small and honest: a bounded planner, an evidence check on its review, and a receipt that only shows what the server logged.
* It runs live, on free tiers, with a public daily cap so judges can try any US address.

### What we learned

* Qloo's taste signal is most useful within a chain size tier, not as a raw ranking on its own.
* A language model is good at choosing among options and bad at arithmetic. Keep the numbers on the server and let the model pick.
* Brokers trust what they can check: store evidence, a map, and math they can edit.

### What's next for LeaseUp

* Grow the panel past 40 markets and track whether pitched brands actually sign.
* Add more tenant types (restaurants, fitness, services) and more store data sources.
* Let brokers upload their own deal history so the ranking learns their market.

---

## Built with

React, TypeScript, Vite, Tailwind CSS, MapLibre GL, TanStack Query, Cloudflare Pages, Cloudflare Workers, Hono, Cloudflare D1, Cloudflare KV, Qloo Taste AI API, OpenAI gpt-4o-mini, All The Places, OpenStreetMap, Nominatim, Vitest, Playwright, Lighthouse CI, GitHub Actions

## Try it out links

* Live app: https://leaseup-59m.pages.dev
* Source (MIT): https://github.com/AtharvRaotole/LeaseUp
* Sample pitch brief: https://leaseup-59m.pages.dev/pitch/demo-boulder-ulta
* How LeaseUp uses Qloo: https://leaseup-59m.pages.dev/methodology/qloo

## Video demo link

https://youtu.be/SRpG3FYun3E

Title: LeaseUp: an AI leasing agent for empty retail space (Qloo Agentic Hackathon 2026). Credits: docs/devpost/VIDEO_CREDITS.md.

---

## Testing instructions for judges

No login or key is needed.

1. Open https://leaseup-59m.pages.dev. The top bar says Live data.
2. Fast path: click a demo chip (Wicker Park, Boulder or Sevierville). These replay recorded Qloo and store data, are marked Recorded demo, and never use quota.
3. Live path: type any US storefront address, for example `240 Bedford Ave, Brooklyn, NY 11249`, and run the report. A cold address takes about 30 to 90 seconds while the server calls Qloo.
4. Agent path: on a report, click Run full prospecting. Watch the planner steps, the review callout after ranking (it says which brand moved and why, or why it declined), and the Agent receipt at the end.
5. Also worth a look: Compare ranking under How we know, the pitch brief, Pipeline, Portfolio and the methodology pages.

Quota: live analyze shares a cap of 48 cold addresses per UTC day so the free Qloo and Cloudflare budgets hold through judging. If you see a quota message, use a demo chip or try again after the UTC day rolls over (7 PM US Eastern from Nov 1, when daylight time ends). Addresses that were already run are cached and do not count.

## Qloo usage (if the form asks separately)

LeaseUp calls Qloo's `/v2/insights` on the server for 227 brand entities at the storefront's location and radius, and location tag insights for the trade area. Qloo affinity is blended with chain size in a model fitted on a 40 address live study, and Qloo scores are reused to find each site's 5 most similar panel markets. The agent's planner and reviewer use the same Qloo tools inside a fixed call budget. Details: https://leaseup-59m.pages.dev/methodology/qloo

## Pre-existing work

None. The repository's first commit is Oct 22, 2026, after the submission period opened. All code, data collection and evaluation were done for this hackathon.

---

## Gallery (3:2, upload in this order)

All in `docs/devpost/gallery/`, 2880x1920 PNG, captured from production on Oct 26, 2026 (`scripts/capture-devpost-gallery-3x2.mjs`). Captions are ready to paste.

1. `01-report-wicker.png`: Site report for Wicker Park, Chicago, with the brands to pitch and the map.
2. `02-agent-review-bedford.png`: A live agent run in Brooklyn. The reviewer moved two brands up and declined two, with the panel numbers.
3. `03-agent-receipt-bedford.png`: The Agent receipt lists only the steps the server logged.
4. `04-report-boulder.png`: Boulder report.
5. `05-pitch-brief.png`: Read only leasing brief to share with a prospect.
6. `06-report-sevierville.png`: Sevierville, a small market.
7. `07-landing.png`: Landing page.
8. `08-brand-sites.png`: Brand sites: pick one of 227 tracked chains to map where its shoppers are.
9. `09-methodology.png`: Methodology: every step from address to ranked brands, with backtests.
10. `10-portfolio.png`: Batch up to 10 addresses.
11. `11-pipeline.png`: Leasing pipeline with notes and reminders.
12. `12-mobile-wicker.png`: Report and map on a phone.
