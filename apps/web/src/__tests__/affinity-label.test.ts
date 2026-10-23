import { describe, it, expect } from 'vitest';
import { formatMetroMatchLabel } from '../lib/affinity-label';

describe('formatMetroMatchLabel', () => {
  it('shows rank within metro cell count', () => {
    expect(formatMetroMatchLabel(3, 1639, 0.99)).toBe('#3 of 1,639 areas');
  });

  it('adds one-decimal top percent when under 1%', () => {
    expect(formatMetroMatchLabel(1, 1639, 0.997882)).toContain('Top 0.2% match');
  });
});
