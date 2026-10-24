const VIEW_MARGIN = 16;
const MAP_PAD = 12;

type HintBox = { left: number; top: number; width: number; height: number; right: number; bottom: number };

function rectsOverlap(a: HintBox, b: HintBox): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function box(left: number, top: number, width: number, height: number): HintBox {
  return { left, top, width, height, right: left + width, bottom: top + height };
}

function inflate(rect: DOMRect, pad: number): HintBox {
  return box(rect.left - pad, rect.top - pad, rect.width + pad * 2, rect.height + pad * 2);
}

function withinViewport(candidate: HintBox, vw: number, vh: number): boolean {
  return (
    candidate.left >= VIEW_MARGIN &&
    candidate.top >= VIEW_MARGIN &&
    candidate.right <= vw - VIEW_MARGIN &&
    candidate.bottom <= vh - VIEW_MARGIN
  );
}

function clearOfMap(candidate: HintBox, avoid: HintBox | null): boolean {
  if (!avoid) return true;
  return !rectsOverlap(candidate, avoid);
}

/** Place the tour hint so it does not cover the map panel (controls + attribution). */
export function computeTourHintPlacement(
  hintWidth: number,
  hintHeight: number
): { left: number; top: number; width: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const mapEl = document.querySelector('[data-testid="report-map-panel"]');
  const mapRect = mapEl?.getBoundingClientRect();
  const avoid =
    mapRect && mapRect.width > 8 && mapRect.height > 8 ? inflate(mapRect, MAP_PAD) : null;

  const stickyBottom = Math.min(vh - VIEW_MARGIN, vh - hintHeight - VIEW_MARGIN);
  const candidates: HintBox[] = [];

  candidates.push(box(VIEW_MARGIN, stickyBottom, hintWidth, hintHeight));

  if (avoid) {
    const aboveMapTop = avoid.top - hintHeight - VIEW_MARGIN;
    if (aboveMapTop >= VIEW_MARGIN) {
      candidates.push(box(VIEW_MARGIN, aboveMapTop, hintWidth, hintHeight));
    }
    const leftOfMap = avoid.left - hintWidth - VIEW_MARGIN;
    if (leftOfMap >= VIEW_MARGIN) {
      candidates.push(box(leftOfMap, stickyBottom, hintWidth, hintHeight));
    }
    const topUnderChrome = 128;
    candidates.push(box(VIEW_MARGIN, topUnderChrome, hintWidth, hintHeight));
    const centeredTop = Math.max(VIEW_MARGIN, topUnderChrome);
    const centeredLeft = Math.max(VIEW_MARGIN, (vw - hintWidth) / 2);
    candidates.push(box(centeredLeft, centeredTop, hintWidth, hintHeight));
  }

  const fullWidth = Math.min(vw - VIEW_MARGIN * 2, 448);
  const fullLeft = (vw - fullWidth) / 2;
  candidates.push(box(fullLeft, stickyBottom, fullWidth, hintHeight));

  for (const candidate of candidates) {
    if (withinViewport(candidate, vw, vh) && clearOfMap(candidate, avoid)) {
      return { left: candidate.left, top: candidate.top, width: candidate.width };
    }
  }

  const fallback = box(
    VIEW_MARGIN,
    Math.max(VIEW_MARGIN, topUnderChromeFallback(vh, hintHeight)),
    hintWidth,
    hintHeight
  );
  return { left: fallback.left, top: fallback.top, width: fallback.width };
}

function topUnderChromeFallback(vh: number, hintHeight: number): number {
  return Math.min(140, vh - hintHeight - VIEW_MARGIN);
}
