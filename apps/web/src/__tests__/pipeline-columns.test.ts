import { describe, it, expect } from 'vitest';
import { nextColumn, prevColumn } from '../lib/pipeline-columns';

describe('pipeline column navigation', () => {
  it('steps forward and back', () => {
    expect(nextColumn('to_pitch')).toBe('contacted');
    expect(prevColumn('contacted')).toBe('to_pitch');
    expect(nextColumn('passed')).toBeNull();
    expect(prevColumn('to_pitch')).toBeNull();
  });
});
