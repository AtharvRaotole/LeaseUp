import { describe, it, expect } from 'vitest';
import { nextProspectStatus, prevProspectStatus } from '../lib/pipeline-status';

describe('pipeline status navigation', () => {
  it('steps forward and back', () => {
    expect(nextProspectStatus('to_pitch')).toBe('drafted');
    expect(prevProspectStatus('drafted')).toBe('to_pitch');
    expect(nextProspectStatus('passed')).toBeNull();
    expect(prevProspectStatus('to_pitch')).toBeNull();
  });
});
