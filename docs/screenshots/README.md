# UI screenshots (design QA)

Captured with `pnpm screenshots` (requires worker on `:8787` demo mode and web preview on `:4173`).

## Checklist (spec section 6)

- Grid alignment and consistent 4px spacing rhythm
- No em or en dashes in UI copy (`apps/web` test enforces)
- Plain language labels (Hit rate, Brands to pitch)
- Light-first tokens; dark via `prefers-color-scheme`
- Report: sticky map column, agent strip, proof, compare, how we know

## Files

- `landing-*.png`, `landing-dark-1440.png`
- `report-{wicker,boulder,sevierville}-{1440,390}.png`
- `report-wicker-expanded.png`, `report-how-we-know.png`, `report-wicker-dark-1440.png`

## Lighthouse (landing, desktop preview)

| Category | Score |
|----------|------:|
| Performance | 93 |
| Accessibility | 96 |
| Best practices | 100 |

Raw JSON: `lighthouse-landing.json`
