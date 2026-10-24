import type { PitchPackSnapshot } from '@leaseup/contracts';
import { PitchPackSnapshotSchema, DEMO_PITCH_BOULDER_ULTA_ID } from '@leaseup/contracts';
import { DEMO_PITCH_BOULDER_ULTA } from '@leaseup/fixtures';

const BY_ID: Record<string, PitchPackSnapshot> = {
  [DEMO_PITCH_BOULDER_ULTA_ID]: PitchPackSnapshotSchema.parse(DEMO_PITCH_BOULDER_ULTA),
};

export function getDemoPitchSnapshot(id: string): PitchPackSnapshot | null {
  return BY_ID[id] ?? null;
}

export function isDemoPitchId(id: string): boolean {
  return id in BY_ID;
}
