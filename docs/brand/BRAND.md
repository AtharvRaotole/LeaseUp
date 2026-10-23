# LeaseUp brand identity

LeaseUp helps retail landlords find tenants whose customers already love the neighborhood. The identity is geometric, quiet, and product-first: closer to Linear or Stripe than to generic proptech clipart.

## Chosen mark: Corner lease (Concept B)

We explored three hand-drawn marks (see `docs/brand/generated/contact-sheet.png`):

| Concept | Idea | 16px verdict |
| --- | --- | --- |
| A: Aperture | Storefront opening in a solid block | Door cutout collapses; reads as a blob |
| **B: Corner lease** | Grid cell with an L-shaped fill | **Stays readable; stroke + fill balance** |
| C: Beacon | Ring with hollow center | Inner hole vanishes; feels like a generic dot |

**Why Corner lease wins:** At 16px it keeps a clear frame and L corner without relying on thin negative space. It encodes a lease corner and city grid without a map pin, sparkles, or building clip art. It pairs cleanly with Geist semibold for the wordmark.

Source files: `docs/brand/concepts/concept-corner-l.svg`, production mark `docs/brand/assets/mark.svg`.

## Logo lockup

- **Mark:** 32px artboard, 5.5px corner radius on the outer frame, 2.25px stroke.
- **Wordmark:** Geist semibold (600), letter-spacing `-0.04em`, optical alignment with mark cap height.
- **Variants:** full color (`wordmark-lockup.svg`), mono (`wordmark-lockup-mono.svg`, `currentColor`), reversed (`wordmark-lockup-reversed.svg`).
- **React:** `apps/web/src/components/brand/Logo.tsx` (`mark` | `wordmark` | `lockup`, `xs`–`lg`).

## Clear space and minimum size

- **Clear space:** At least 0.5× mark height on all sides (equal to half the mark width).
- **Minimum mark:** 16px for favicons and dense UI; do not go smaller.
- **Minimum lockup:** 24px mark height (use `Logo` size `xs` or larger in navigation).

## Color

| Role | Light | Dark |
| --- | --- | --- |
| Accent | `#0F6B4F` | `#3FBF8F` |
| Ink / text | `#121212` | `#EDEDEF` |
| Background | `#FAFAF7` | `#0B0B0C` |
| Surface | `#FFFFFF` | `#141416` |

Marks in UI use `currentColor` on the accent token unless a fixed SVG export is required.

## Typography

- **UI / wordmark:** Geist
- **Data / labels:** Geist Mono
- **Display headlines:** Instrument Serif

## Do

- Use provided SVG assets or the `Logo` component.
- Keep marks flat: solid fills and strokes only.
- Use accent green for the mark in product chrome; ink for the wordmark text in lockups.
- Regenerate raster assets with `node scripts/generate-brand-assets.mjs` after SVG changes.

## Don't

- Add gradients, glows, sparkles, rockets, or AI stock icons.
- Use map-pin-with-building clipart or photographic marks.
- Stretch, rotate, or recolor outside the palette.
- Place the lockup on busy photography without a solid scrim.
- Use em dashes or en dashes in customer-facing copy (CI checks bundles and sources).

## Asset map

```
docs/brand/
  BRAND.md
  concepts/           # Exploration SVGs
  assets/             # Canonical SVG lockups + og-template.svg
  generated/          # contact-sheet.png (generated)

apps/web/public/
  favicon.svg, favicon.ico, apple-touch-icon.png
  icon-192.png, icon-512.png, og.png, site.webmanifest
```
