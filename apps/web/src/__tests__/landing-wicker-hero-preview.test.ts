import { describe, it, expect } from 'vitest';
import { wickerLandingPitchTopNames } from '@leaseup/fixtures';
import { LANDING_WICKER_PREVIEW } from '../data/landing-wicker-preview';

const HERO_TOP_N = 3;

describe('landing hero Wicker preview', () => {
  it('hero top-N pitch order matches the Wicker demo fixture analyze output', () => {
    const heroNames = LANDING_WICKER_PREVIEW.prospects
      .slice(0, HERO_TOP_N)
      .map((p) => p.brand.name);
    expect(heroNames).toEqual(wickerLandingPitchTopNames(HERO_TOP_N));
  });

  it('recorded preview includes at least hero depth of prospects', () => {
    expect(LANDING_WICKER_PREVIEW.prospects.length).toBeGreaterThanOrEqual(HERO_TOP_N);
  });

  it('recorded preview omits the ATP acronym and Wikidata QID coverage jargon', () => {
    const blob = JSON.stringify(LANDING_WICKER_PREVIEW);
    expect(blob).not.toMatch(/\bATP\b/);
    expect(blob).not.toContain('Wikidata QID');
    expect(blob).toContain('All The Places store data');
  });
});
