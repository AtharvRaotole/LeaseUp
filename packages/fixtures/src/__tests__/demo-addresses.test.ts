import { describe, expect, it } from 'vitest';
import { DEMO_CHIP_ADDRESSES, matchDemoFixtureId } from '../demo-addresses.js';

describe('matchDemoFixtureId', () => {
  it('matches primary demo chip addresses', () => {
    expect(matchDemoFixtureId(DEMO_CHIP_ADDRESSES.wicker)).toBe('wicker');
    expect(matchDemoFixtureId(DEMO_CHIP_ADDRESSES.boulder)).toBe('boulder');
  });

  it('accepts legacy demo addresses', () => {
    expect(matchDemoFixtureId('1574 N Milwaukee Ave, Chicago, IL 60622')).toBe('wicker');
    expect(matchDemoFixtureId('1125 Pearl St, Boulder, CO 80302')).toBe('boulder');
  });
});
