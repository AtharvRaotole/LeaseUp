import { describe, it, expect } from 'vitest';
import { landingEvalProofParagraphs } from '../lib/landing-eval-copy';

describe('landingEvalProofParagraphs', () => {
  it('uses committed 40-site eval headline numbers and P@10 wording', () => {
    const text = landingEvalProofParagraphs().join(' ');
    expect(text).toContain('40 US neighborhoods');
    expect(text).toContain('54%');
    expect(text).not.toContain('64%');
    expect(text).toContain('76%');
    expect(text).toContain('82%');
    expect(text).toContain('Precision at 10');
    expect(text).toContain('already had a store in the trade area');
    expect(text).not.toMatch(/not nearby/i);
    expect(text).not.toMatch(/openings/i);
  });
});
