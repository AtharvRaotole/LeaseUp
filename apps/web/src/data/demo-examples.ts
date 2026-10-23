import { DEMO_CHIP_ADDRESSES, type DemoFixtureId } from '@leaseup/fixtures';

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
    hitRateLabel: 'Hit rate 10 of 10',
    address: DEMO_CHIP_ADDRESSES.wicker,
  },
  {
    id: 'boulder',
    neighborhood: 'Pearl Street',
    city: 'Boulder',
    hitRateLabel: 'Hit rate 9 of 10',
    address: DEMO_CHIP_ADDRESSES.boulder,
  },
  {
    id: 'sevierville',
    neighborhood: 'Sevierville',
    city: 'Tennessee',
    hitRateLabel: 'Hit rate 8 of 10',
    address: DEMO_CHIP_ADDRESSES.sevierville,
  },
];
