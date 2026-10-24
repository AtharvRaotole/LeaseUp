import { describe, it, expect } from 'vitest';
import {
  landingEvalProofParagraphs,
  methodologySiteTableBridgeLine,
} from '../lib/landing-eval-copy';

describe('landingEvalProofParagraphs', () => {
  it('uses committed 40-site eval headline numbers and plain top-10 hit rate wording', () => {
    const text = landingEvalProofParagraphs().join(' ');
    expect(text).toContain('40 US neighborhoods');
    expect(text).toContain('54%');
    expect(text).not.toContain('64%');
    expect(text).toContain('76%');
    expect(text).toContain('83%');
    expect(text).toContain('Top-10 hit rate');
    expect(text).not.toMatch(/P@10/);
    expect(text).toContain('already had a store nearby');
    expect(text).not.toMatch(/not nearby/i);
    expect(text).not.toMatch(/openings/i);
  });
});

describe('methodologySiteTableBridgeLine', () => {
  it('cites cohort headline percents and distinguishes demo rows', () => {
    const line = methodologySiteTableBridgeLine();
    expect(line).toContain('sanity checks');
    expect(line).toContain('54%');
    expect(line).toContain('76%');
    expect(line).toContain('83%');
    expect(line).toContain('landing proof');
  });
});
