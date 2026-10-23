# QA findings (out-of-scope routes)

Issues found during the production-readiness pass (axe-core + Lighthouse). **Do not fix in this pass** — edit the listed files directly.

## `/brand` — `apps/web/src/pages/BrandPage.tsx`

| Rule | Impact | Location | Recommended fix |
|------|--------|----------|-----------------|
| `aria-input-field-name` | serious | Brand search `<Input id="brand-search">` (~L82–89) | Ensure the control has an accessible name: keep `htmlFor` on the label, or add `aria-label="Search brands"` on the input if the label is not associated in the a11y tree. |
| `aria-required-children` | serious | `<ul role="listbox">` (~L91–112) | A `listbox` must only contain `option` elements (or `group` > `option`). Either remove `role="listbox"` and use a plain list (`role="list"` / no role), or set each `<button>` to `role="option"` with `aria-selected="false"` and wire `aria-activedescendant` on a combobox pattern. |
| `listitem` | serious | `<li>` under misused `listbox` (~L98–107) | Resolved together with the listbox fix: valid structure is `ul[role=listbox] > li[role=option]` or drop listbox semantics. |

## `/brand/:id` — `apps/web/src/pages/BrandPage.tsx` + map

| Rule | Impact | Location | Recommended fix |
|------|--------|----------|-----------------|
| Map controls | moderate (excluded in e2e) | `BrandReverseMap` / MapLibre | Third-party map canvas excluded from axe in `e2e/a11y.spec.ts`; audit MapLibre control labels if tightening a11y further. |

## Report — `apps/web/src/pages/ReportPage.tsx` and report components

| Source | Impact | Notes |
|--------|--------|-------|
| Lighthouse accessibility | moderate | Local score **0.95** on Wicker demo URL (target 1.0). Re-run Lighthouse → Accessibility → failing audits for exact nodes (likely interactive map chrome, chart labels, or contrast in report-only UI). |
| axe (with map excluded) | — | **0** serious/critical violations on demo report URL after shared UI token/Badge fixes. Remaining Lighthouse gap is likely **moderate** audits or map-adjacent UI not covered by axe tags. |

**Files to inspect first:** `ReportPage.tsx`, `ReportStickyHeader.tsx`, `ReportMap.tsx`, `ReportMapInner.tsx`, and any report list/table components referenced from the report route.

## Portfolio — `apps/web/src/pages/PortfolioPage.tsx` (and children)

| Source | Impact | Notes |
|--------|--------|-------|
| axe | — | **0** serious/critical on `/portfolio` in demo preview (map regions excluded). |

No portfolio code changes required for serious/critical axe in this pass.

## Performance (Lighthouse)

| Page | Score (after pass) | Owner |
|------|-------------------|--------|
| `/` | Performance ~0.86 (target 0.95+) | Further gains need smaller initial JS (fixtures still load on below-fold) and image/asset tuning in landing components. |
| Wicker report | Performance ~0.73 (target 0.95+) | Dominated by report route JS, map, and analysis UI — optimize in report/analysis modules and data fetching, not in shared shell alone. |
