import { describe, it, expect } from 'vitest';
import {
  isAcceptableOutreachDraft,
  outreachHasBracketPlaceholder,
  outreachStockPhraseViolations,
} from '../outreach-quality';

describe('outreach draft quality', () => {
  it('rejects bracket placeholders', () => {
    const bad = "Dear [Broker's Name], I hope this message finds you well.\n\nWe have space.";
    expect(outreachHasBracketPlaceholder(bad)).toBe(true);
    expect(isAcceptableOutreachDraft(bad)).toBe(false);
    expect(outreachStockPhraseViolations(bad)).toContain('bracket_placeholder');
  });

  it('rejects stock filler openers', () => {
    const bad = 'I hope this email finds you well.\n\nQloo ranks Vans #13 in Wicker Park.';
    expect(isAcceptableOutreachDraft(bad)).toBe(false);
  });

  it('accepts a grounded short opener', () => {
    const ok =
      'Qloo ranks Vans #13 in Wicker Park, with no Vans within 10 km (ATP + OSM). ' +
      'Nearby retail includes Sephora and Whole Foods. We can share the site pack for 1574 N Milwaukee Ave.';
    expect(isAcceptableOutreachDraft(ok)).toBe(true);
  });
});
