import { describe, it, expect } from 'vitest';
import {
  pitchBrandTasteFitSentence,
  sanitizeWhyBrandTasteSummary,
} from '../why-brand-taste-summary.js';

describe('sanitizeWhyBrandTasteSummary', () => {
  it('strips unit affinity decimals and banned filler', () => {
    const raw =
      'Ulta resonates well with Yoga at 0.80 and trendy lifestyles near Pearl Street.';
    const cleaned = sanitizeWhyBrandTasteSummary(raw);
    expect(cleaned).not.toMatch(/\b0\.\d+\b/);
    expect(cleaned.toLowerCase()).not.toContain('resonates well');
    expect(cleaned.toLowerCase()).not.toContain('trendy lifestyles');
    expect(cleaned).toContain('Yoga');
  });

  it('removes duplicate Audience label lines embedded in summary text', () => {
    const cleaned = sanitizeWhyBrandTasteSummary(
      'Strong overlap. Audience: Yoga. Audience: Health & Beauty.'
    );
    expect(cleaned).not.toMatch(/Audience:\s*Yoga/i);
  });
});

describe('pitchBrandTasteFitSentence', () => {
  it('returns one sentence from signals when summary is generic junk', () => {
    const line = pitchBrandTasteFitSentence('Ulta', {
      summary: 'This brand resonates well with local shoppers at 0.74.',
      signals: [{ kind: 'audience', name: 'Health & Beauty', affinity: 0.74, affinityRank: 27 }],
    });
    expect(line).toContain('Ulta');
    expect(line).toContain('Health & Beauty');
    expect(line).not.toMatch(/\b0\.\d+\b/);
    expect(line).not.toMatch(/Audience:/);
  });
});
