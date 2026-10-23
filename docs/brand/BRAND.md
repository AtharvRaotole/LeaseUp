# LeaseUp brand

LeaseUp helps landlords find the retail tenants a space is missing. The mark should feel precise, confident, and product-grade (Linear, Stripe, Vercel).

## Color

| Token | Light | Dark |
| --- | --- | --- |
| Accent | `#0F6B4F` | `#3FBF8F` |
| Ink | `#121212` | `#EDEDEF` |

## Explorations

Three hand-built SVG directions were drawn and rasterized at 16px, 32px, and 128px:

| ID | Concept | Files |
| --- | --- | --- |
| A | Storefront frame with upward arrow | `explorations/exploration-a.svg`, `exploration-a-{16,32,128}.png` |
| B | **L monogram + upward chevron (selected)** | `explorations/exploration-b.svg`, `exploration-b-{16,32,128}.png` |
| C | Map pin with door cutout | `explorations/exploration-c.svg`, `exploration-c-{16,32,128}.png` |

Side-by-side preview: [`explorations-comparison.png`](./explorations-comparison.png)

### Rationale for B

- **16px legibility:** Two solid fills, no hairline strokes; the chevron reads as growth/up and the L anchors the wordmark.
- **Meaning:** The chevron is upward momentum (leasing up); the L ties to LeaseUp without a generic pin clip-art.
- A relied on strokes that muddy at favicon size; C’s pin interior door was lost on dark UI chrome.

## Production assets

| Asset | Path |
| --- | --- |
| Favicon SVG (light/dark via `prefers-color-scheme`) | `apps/web/public/favicon.svg` |
| Favicon ICO | `apps/web/public/favicon.ico` |
| Apple touch | `apps/web/public/apple-touch-icon.png` |
| PWA icons | `apps/web/public/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` |
| Web manifest | `apps/web/public/site.webmanifest` |
| Safari pinned tab | `apps/web/public/safari-pinned-tab.svg` |
| Open Graph | `apps/web/public/og-image.png` (1200×630) |

Regenerate rasters: `node scripts/render-brand-assets.mjs`

## Wordmark

- **Family:** Geist semibold (`font-semibold`)
- **Tracking:** `-0.02em`
- **Lockup:** Glyph + wordmark with ~0.42rem optical gap (see `Logo` component)

## React

```tsx
import { Logo, LeaseUpGlyph, BrandLoading } from '../components/brand/Logo';
```

Variants: `glyph`, `wordmark`, `lockup`.
