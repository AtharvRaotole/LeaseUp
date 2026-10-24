import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { computeTourHintPlacement } from '../components/report/tour-hint-placement';

describe('computeTourHintPlacement', () => {
  const hintW = 320;
  const hintH = 140;

  beforeEach(() => {
    vi.stubGlobal('window', { innerWidth: 1440, innerHeight: 900 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function mockViewport(width: number, height: number) {
    vi.stubGlobal('window', { innerWidth: width, innerHeight: height });
  }

  function mockMapPanel(rect: { left: number; top: number; width: number; height: number }) {
    const el = {
      getBoundingClientRect: () =>
        ({
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          right: rect.left + rect.width,
          bottom: rect.top + rect.height,
          x: rect.left,
          y: rect.top,
          toJSON: () => ({}),
        }) as DOMRect,
    };
    vi.stubGlobal('document', {
      querySelector: (selector: string) =>
        selector === '[data-testid="report-map-panel"]' ? el : null,
    } as Document);
  }

  function hintBox(placement: { left: number; top: number; width: number }) {
    return {
      left: placement.left,
      top: placement.top,
      right: placement.left + hintW,
      bottom: placement.top + hintH,
    };
  }

  function mapBox(rect: { left: number; top: number; width: number; height: number }) {
    const pad = 12;
    return {
      left: rect.left - pad,
      top: rect.top - pad,
      right: rect.left + rect.width + pad,
      bottom: rect.top + rect.height + pad,
    };
  }

  function overlaps(
    a: { left: number; top: number; right: number; bottom: number },
    b: { left: number; top: number; right: number; bottom: number }
  ) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }

  it('keeps hint clear of right map column at 1440', () => {
    mockViewport(1440, 900);
    mockMapPanel({ left: 820, top: 120, width: 520, height: 640 });
    const placement = computeTourHintPlacement(hintW, hintH);
    const avoid = mapBox({ left: 820, top: 120, width: 520, height: 640 });
    expect(overlaps(hintBox(placement), avoid)).toBe(false);
  });

  it('keeps hint clear of stacked map at 1024', () => {
    mockViewport(1024, 900);
    mockMapPanel({ left: 32, top: 520, width: 960, height: 360 });
    const placement = computeTourHintPlacement(hintW, hintH);
    const avoid = mapBox({ left: 32, top: 520, width: 960, height: 360 });
    expect(overlaps(hintBox(placement), avoid)).toBe(false);
  });

  it('keeps hint clear of full-width map at 390', () => {
    mockViewport(390, 844);
    mockMapPanel({ left: 0, top: 200, width: 390, height: 520 });
    const placement = computeTourHintPlacement(hintW, hintH);
    const avoid = mapBox({ left: 0, top: 200, width: 390, height: 520 });
    expect(overlaps(hintBox(placement), avoid)).toBe(false);
  });
});
