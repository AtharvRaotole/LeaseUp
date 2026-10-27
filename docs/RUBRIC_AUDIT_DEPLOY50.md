# Qloo Agentic Hackathon: final judge rubric audit (LeaseUp), deploy50

**Locked rubric:** same as [`RUBRIC_AUDIT_OCT24.md`](RUBRIC_AUDIT_OCT24.md) and [`RUBRIC_AUDIT_DEPLOY48.md`](RUBRIC_AUDIT_DEPLOY48.md): six criteria, unweighted mean, same anchors and method. No category was added or changed.

**Baseline:** production **deploy50**, live since about 00:53 UTC on Oct 27, 2026 (8:53 PM Eastern on Oct 26). `GET /api/health` returned **`gitSha` `0b1154d`**, `mode` `live`, Qloo and OpenAI configured. Rollback target is deploy49 (`1e16d21`). Previous composite: **8.083** (deploy49).

## Summary table

| Criterion | deploy49 | deploy50 | One-line verdict |
| --- | ---: | ---: | --- |
| Use of Qloo API | 7.75 | **7.75** | Unchanged. |
| Agentic behavior | 8.5 | **8.5** | Held, not raised. Live deploy49 runs showed gpt-4o-mini declining lifts the rule backs and writing wrong arithmetic in its reasons. #189 checks every model call against the rule and quotes server numbers; a live deploy50 run is correct. The deploy49 score assumed this already worked. |
| Technical execution | 9.25 | **9.25** | Unchanged. |
| Originality | 7.25 | **7.25** | Unchanged. |
| Real-world usefulness | 8.25 | **8.25** | Unchanged. |
| Presentation | 7.5 | **7.75** | The cap from the owner hold is gone: twelve 3:2 production stills, a README with a judge quick start and current screenshots, and a paste ready Devpost pack. Not higher: the walkthrough video is made outside this repo and was not reviewed here. |

**Composite:** (7.75 + 8.5 + 9.25 + 7.25 + 8.25 + 7.75) / 6 = 48.75 / 6 = **8.125** (not rounded).

## What changed

**#189 Check every model review call against the panel test** (`0b1154d`). In `prospecting-agent-review.ts`, each `lift_pitch` or `decline_lift` call on an eligible lift is compared with `comparableMarketsVerdict`. If the model agrees, its decision stands; if not, the rule's decision is used and the reason starts with "Panel check overruled the model." The reason text is built by the server from both brands' numbers.

Evidence:

* deploy49, Pasadena job `c0074bc6-b334-4a4d-831a-a8ec93a03ddd`: the model declined HomeGoods with "28% is equal to VS 28% minus 10 points", which is wrong.
* deploy50, 240 Bedford Ave job `5ea1265e-e01e-46aa-ac91-79511f31cebb`: H&M #3 to #2 (overruled the model), HomeGoods #7 to #5 over Nike (30% vs 24%), Michael Kors (8%) and Vans (19% vs 30%) kept below Victoria's Secret, all with correct numbers. 2 gpt-4o-mini calls, 5,217 tokens.
* Older stored jobs from deploy49 still show the old reasons; they are records of that run, not recomputed.

**Docs and stills:** `docs/devpost/SUBMISSION_PACK.md`, refreshed `SUBMISSION.md`, `GALLERY_ASSETS.md`, README, and `docs/devpost/gallery/01-` to `12-` PNGs.

## Production checks on deploy50

`smoke47` at 1440 and 390 px: 22 pages, 0 bad pages, 0 console errors, 0 CSP issues, 0 HTTP 429, 5 of 5 pitch pages, pipeline and watchlist flows ok, no analyze calls from GET pages.
