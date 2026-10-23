import { describe, it, expect } from 'vitest';
import { buildReportPath } from '../lib/report-params';
import { DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures';

describe('landing demo chips', () => {
  it('routes each chip with slug so headlines use demo neighborhood names', () => {
    expect(buildReportPath({ address: DEMO_CHIP_ADDRESSES.wicker, radius: 10 }, 'wicker')).toContain(
      '/r/wicker?'
    );
    expect(buildReportPath({ address: DEMO_CHIP_ADDRESSES.wicker, radius: 10 }, 'wicker')).toContain(
      'radius=10'
    );
    expect(buildReportPath({ address: DEMO_CHIP_ADDRESSES.boulder, radius: 10 }, 'boulder')).toContain(
      '/r/boulder?'
    );
    expect(buildReportPath({ address: DEMO_CHIP_ADDRESSES.sevierville, radius: 10 }, 'sevierville')).toContain(
      '/r/sevierville?'
    );
  });
});
