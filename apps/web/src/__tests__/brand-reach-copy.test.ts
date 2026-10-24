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
    expect(line).toContain('example.com');
    expect(line).not.toContain('https://');
  });

  it('uses plain copy when not verified', () => {
    const line = brandReachPlainLine({
      status: 'not_yet_found',
      searchUrl: 'https://www.google.com/search?q=test',
    });
    expect(line).toBe('How to reach them: Search for their real estate contact.');
  });
});
