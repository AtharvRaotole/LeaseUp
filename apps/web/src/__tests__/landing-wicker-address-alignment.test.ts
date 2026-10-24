import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures';
import { LANDING_WICKER_DEMO_ADDRESS } from '../data/landing-wicker-demo-address';
import { LANDING_WICKER_PREVIEW } from '../data/landing-wicker-preview';
import { landingWickerReportPath } from '../components/landing/LandingReportPreview';
import { LANDING_DEMO_CHIPS } from '../data/landing-demo-chips';

describe('landing Wicker demo address alignment', () => {
  it('matches demo chip, preview fixture, hero report path, and step 1 crop', () => {
    const canonical = DEMO_CHIP_ADDRESSES.wicker;
    expect(LANDING_WICKER_DEMO_ADDRESS).toBe(canonical);
    expect(LANDING_WICKER_PREVIEW.location.address).toBe(canonical);
    expect(LANDING_DEMO_CHIPS.find((c) => c.id === 'wicker')?.address).toBe(canonical);
    expect(decodeURIComponent(landingWickerReportPath)).toContain('1560');
    expect(decodeURIComponent(landingWickerReportPath)).toContain('Milwaukee');

    const stepCrops = readFileSync(
      join(process.cwd(), 'src/components/landing/LandingStepCrops.tsx'),
      'utf8'
    );
    expect(stepCrops).toContain('LANDING_WICKER_DEMO_ADDRESS');
    expect(stepCrops).not.toMatch(/1574 N Milwaukee/);
  });
});
