import { describe, it, expect } from 'vitest';
import { wickerLandingProspectTopNames } from '@leaseup/fixtures';
import { LANDING_WICKER_PREVIEW } from '../data/landing-wicker-preview';

const HERO_TOP_N = 3;

describe('landing hero Wicker preview', () => {
  it('hero top-N prospect order matches the Wicker demo fixture analyze output', () => {
    const heroNames = LANDING_WICKER_PREVIEW.prospects
      .slice(0, HERO_TOP_N)
      .map((p) => p.brand.name);
    expect(heroNames).toEqual(wickerLandingProspectTopNames(HERO_TOP_N));
  });

  it('matches live Wicker report top ranks (no Crumbl or American Eagle)', () => {
    const heroNames = LANDING_WICKER_PREVIEW.prospects
      .slice(0, 5)
      .map((p) => p.brand.name);
    expect(heroNames).toEqual([
      'TJ Maxx',
      "Victoria's Secret",
      'J.Crew',
      'H&M',
      'Vans',
    ]);
  });

  it('recorded preview includes at least hero depth of prospects', () => {
    expect(LANDING_WICKER_PREVIEW.prospects.length).toBeGreaterThanOrEqual(HERO_TOP_N);
  });

  it('recorded preview omits the ATP acronym and uses one-line OSM coverage copy', () => {
    const blob = JSON.stringify(LANDING_WICKER_PREVIEW);
    expect(blob).not.toMatch(/\bATP\b/);
    expect(blob).not.toContain('Wikidata QID');
    expect(blob).toContain(
      'Store locations from All The Places; this brand is not in our OpenStreetMap snapshot.'
    );
    expect(blob).not.toContain('showing All The Places store data only. Store locations');
  });
});
