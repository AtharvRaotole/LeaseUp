import type { DemoFixtureId } from '@leaseup/fixtures';
import { DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures';

export const LANDING_DEMO_CHIPS: Array<{
  id: DemoFixtureId;
  label: string;
  address: string;
}> = [
  {
    id: 'wicker',
    label: 'Try Wicker Park, Chicago',
    address: DEMO_CHIP_ADDRESSES.wicker,
  },
  {
    id: 'boulder',
    label: 'Try Pearl Street, Boulder',
    address: DEMO_CHIP_ADDRESSES.boulder,
  },
  {
    id: 'sevierville',
    label: 'Try Sevierville, Tennessee',
    address: DEMO_CHIP_ADDRESSES.sevierville,
  },
];
