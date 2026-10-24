import { describe, it, expect } from 'vitest';
import { QLOO_BROKER_EXPLAINER } from '../lib/qloo-broker-explainer-copy';

describe('QLOO_BROKER_EXPLAINER', () => {
  it('uses plain copy without em or en dashes', () => {
    const blob = JSON.stringify(QLOO_BROKER_EXPLAINER);
    expect(blob).not.toMatch(/[\u2013\u2014]/);
  });

  it('cites only eval-backed headline percentages', () => {
    const blob = JSON.stringify(QLOO_BROKER_EXPLAINER);
    expect(blob).toContain('54%');
    expect(blob).toContain('76%');
    expect(blob).toContain('82%');
    expect(blob).toContain('0.667');
    expect(blob).toContain('53%');
    expect(blob).not.toMatch(/72%/);
    expect(blob).toMatch(/never say zero false positives/i);
  });
});
