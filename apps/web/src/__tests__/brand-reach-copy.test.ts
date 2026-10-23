import { describe, expect, it } from 'vitest';
import { brandReachPlainLine } from '../lib/brand-reach-copy';

describe('brandReachPlainLine', () => {
  it('uses verified url', () => {
    const line = brandReachPlainLine({
      status: 'verified',
      url: 'https://example.com/real-estate',
      source: 'https://example.com/real-estate',
    });
    expect(line).toContain('How to reach them');
    expect(line).toContain('https://example.com/real-estate');
  });

  it('uses search fallback', () => {
    const line = brandReachPlainLine({
      status: 'not_yet_found',
      searchUrl: 'https://www.google.com/search?q=test',
    });
    expect(line).toContain('not verified');
    expect(line).toContain('google.com');
  });
});
