import { describe, it, expect } from 'vitest';
import {
  tasteFitTopBucketFromBeyondChainPercentile,
  tasteFitMatchHerePhrase,
  fitPercentileLabel,
} from '../lib/fit-display';

describe('tasteFitBeyondChainPercentile copy', () => {
  it('maps higher percentiles to smaller top buckets', () => {
    expect(tasteFitTopBucketFromBeyondChainPercentile(82)).toBe(18);
    expect(tasteFitTopBucketFromBeyondChainPercentile(95)).toBe(5);
  });

  it('writes broker-facing taste lines for p=82 and p=95', () => {
    expect(tasteFitMatchHerePhrase(40, 200, 82)).toBe('Top 18% local match here');
    expect(tasteFitMatchHerePhrase(10, 200, 95)).toBe('Top 5% local match here');
    expect(fitPercentileLabel(40, 200, 82)).toBe('Top 18% local match');
    expect(fitPercentileLabel(10, 200, 95)).toBe('Top 5% local match');
  });
});
