import {
  DEMO_CHIP_ADDRESSES,
  demoChipIdsByQlooLift,
  demoChipQlooProof,
  type DemoFixtureId,
} from '@leaseup/fixtures';
import { demoChipProofLabel } from '../lib/broker-copy';

function demoExampleChipLabel(id: DemoFixtureId): string {
  const { qlooPresentInTop10, lift } = demoChipQlooProof(id, 10);
  const tiedNote = lift === 0 ? 'tied without taste' : undefined;
  return demoChipProofLabel(qlooPresentInTop10, tiedNote);
}

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
  hitRateLabel: demoExampleChipLabel(id),
}));
