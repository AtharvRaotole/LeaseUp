import { describe, it, expect } from 'vitest';
import { landingEvalProofParagraphs } from '../lib/landing-eval-copy';

describe('landingEvalProofParagraphs', () => {
  it('uses committed 40-site eval headline numbers', () => {
    const lines = landingEvalProofParagraphs();
    expect(lines.join(' ')).toContain('40 US neighborhoods');
    expect(lines.join(' ')).toContain('54%');
    expect(lines.join(' ')).toContain('76%');
    expect(lines.join(' ')).toContain('percentage points');
    expect(lines.join(' ')).toContain('82%');
  });
});
