import { DEMO_CHIP_ADDRESSES, demoChipHitRateLabel, type DemoFixtureId } from '@leaseup/fixtures';

/** Hit rates from fixture backtests (recorded Qloo validation, Oct 2026). */
export const DEMO_EXAMPLES: Array<{
  id: DemoFixtureId;
  neighborhood: string;
  city: string;
  hitRateLabel: string;
  address: string;
}> = [
  {
    id: 'wicker',
    neighborhood: 'Wicker Park',
    city: 'Chicago',
    hitRateLabel: demoChipHitRateLabel('wicker'),
    address: DEMO_CHIP_ADDRESSES.wicker,
  },
  {
    id: 'boulder',
    neighborhood: 'Pearl Street',
    city: 'Boulder',
    hitRateLabel: demoChipHitRateLabel('boulder'),
    address: DEMO_CHIP_ADDRESSES.boulder,
  },
  {
    id: 'sevierville',
    neighborhood: 'Sevierville',
    city: 'Tennessee',
    hitRateLabel: demoChipHitRateLabel('sevierville'),
    address: DEMO_CHIP_ADDRESSES.sevierville,
  },
];
