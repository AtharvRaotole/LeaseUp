import {
  DEMO_CHIP_DISPLAYS,
  demoChipPresentInTop10,
  type DemoFixtureId,
} from '@leaseup/fixtures';
import { demoChipProofLabel } from '../lib/broker-copy';

export type LandingProofChip = {
  id: DemoFixtureId;
  neighborhood: string;
  city: string;
  presentInTop10: number;
  hitRateLabel: string;
};

export const LANDING_PROOF_CHIPS: LandingProofChip[] = DEMO_CHIP_DISPLAYS.map((chip) => ({
  id: chip.id,
  neighborhood: chip.neighborhood,
  city: chip.city,
  presentInTop10: demoChipPresentInTop10(chip.id),
  hitRateLabel: demoChipProofLabel(demoChipPresentInTop10(chip.id)),
}));
