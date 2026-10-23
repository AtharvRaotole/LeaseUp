import {
  DEMO_CHIP_ADDRESSES,
  demoChipIdsByQlooLift,
  demoChipProofHitRateLabel,
  type DemoFixtureId,
} from '@leaseup/fixtures';

const DEMO_CHIP_META: Record<
  DemoFixtureId,
  { neighborhood: string; city: string; address: string }
> = {
  wicker: {
    neighborhood: 'Wicker Park',
    city: 'Chicago',
    address: DEMO_CHIP_ADDRESSES.wicker,
  },
  boulder: {
    neighborhood: 'Pearl Street',
    city: 'Boulder',
    address: DEMO_CHIP_ADDRESSES.boulder,
  },
  sevierville: {
    neighborhood: 'Sevierville',
    city: 'Tennessee',
    address: DEMO_CHIP_ADDRESSES.sevierville,
  },
};

/** Demo chips ordered by honest Qloo lift vs chain-size baseline (fixtures @ 10 km). */
export const DEMO_EXAMPLES = demoChipIdsByQlooLift().map((id) => ({
  id,
  ...DEMO_CHIP_META[id],
  hitRateLabel: demoChipProofHitRateLabel(id),
}));
