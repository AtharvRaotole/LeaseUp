# Devpost gallery (deploy34 production screenshots)

Report, pitch, brand, portfolio, and methodology PNGs were captured from **https://leaseup-59m.pages.dev** at integration head **81a0b49** (deploy33). Production is now **deploy34** at **`84971a5`** (prospecting planner + agent receipt); those report stills remain representative of the report UI. Regenerate report captures with `node scripts/capture-devpost-gallery-prod.mjs` when the recording hold lifts. No video; upload stills only.

| Image | Caption |
| --- | --- |
| `report-wicker-1440.png` | Wicker Park, Chicago: the report headline counts eight brands that match local taste with no chain store within three kilometers, with stat tiles and a ranked pitch list beside the map. |
| `report-wicker-390.png` | Same Wicker report on a phone-width layout: headline, three stat cards, and the start of the top brands list without horizontal scroll. |
| `report-bleecker-1440.png` | West Village, New York (350 Bleecker): seven pitch brands with no store within three kilometers; HomeGoods leads the list with nearest-store distances on each row. |
| `report-boulder-1440.png` | Pearl Street, Boulder: nine pitch brands; Ulta is ranked first with a shared local audience line for Health and Beauty and an eleven kilometer nearest-store note. |
| `report-sevierville-1440.png` | Sevierville, Tennessee: ten pitch brands with no store within four kilometers; Michaels is first with Arts and Crafts called out on the row. |
| `pitch-boulder-1440.png` | Sample leasing brief for Ulta at Pearl Street: match summary, fit bullets, trade area facts, and a link to reach the brand. |
| `brand-1440.png` | Brand sites view for Bath and Body Works in Chicago: a taste heatmap and numbered gap opportunities, with the Loop site listed first. |
| `portfolio-1440.png` | Portfolio mode: paste up to ten storefront addresses or upload a CSV, then geocode and analyze them in sequence. |
| `methodology-1440.png` | Methodology page opening: how LeaseUp ranks tenants, with a link to the plain-language Qloo explainer. |

## Suggested Devpost order (6 to 7 images)

1. `report-wicker-1440.png` (hero: full product)
2. `report-boulder-1440.png` (audience lines on pitch rows)
3. `pitch-boulder-1440.png` (shareable brief)
4. `report-bleecker-1440.png` (second city pin)
5. `brand-1440.png` (brand-side exploration)
6. `report-wicker-390.png` (mobile)
7. `methodology-1440.png` (trust and definitions)

Optional eighth: `report-sevierville-1440.png` or `portfolio-1440.png`.

## TODO: agent receipt gallery still (blocked)

**Do not** add `agent-receipt-1440.png` to Devpost until the plain-language receipt copy pass from cloud agent **bc-2041c19b** (`cursor/usability-pass-ca63`) lands on integration. Current production receipt UI can still show internal tool ids (for example `qloo_brand_insights`) under **Rule** / **Agent** lines; that is not gallery-ready.

When unblocked (after merge + recording hold if needed):

1. Run `node scripts/agent-receipt-screenshots.mjs` (preview route `/__preview/prospecting-receipt` with `VITE_PREVIEW_ROUTES=1`; see `ProspectingReceiptPreviewPage.tsx`).
2. Copy the 1440 PNG into `docs/devpost/gallery/agent-receipt-1440.png` and add a caption here: completed Wicker demo run, **Agent receipt** expanded with logged steps and planner **Rule** / **Agent** labels (no inflated autonomy claims).
