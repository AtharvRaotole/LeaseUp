import { describe, it, expect } from 'vitest';
import { DEMO_CHIP_ADDRESSES, matchDemoFixtureId } from '../lib/demo-chip-addresses';

describe('demo chip addresses', () => {
  it('matches canonical and legacy wicker strings', () => {
    expect(matchDemoFixtureId(DEMO_CHIP_ADDRESSES.wicker)).toBe('wicker');
    expect(matchDemoFixtureId('1574 N Milwaukee Ave, Chicago, IL 60622')).toBe('wicker');
  });
});
