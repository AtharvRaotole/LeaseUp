import {
  DEMO_PITCH_BOULDER_ULTA_ID,
  PitchPackSnapshotSchema,
  type PitchPackSnapshot,
} from '@leaseup/contracts';
import { DEMO_PITCH_BOULDER_ULTA } from '@leaseup/fixtures';

/** Recorded demo pitch packs served without API (same JSON as worker demo catalog). */
export function loadDemoPitchSnapshot(id: string): PitchPackSnapshot | null {
  if (id === DEMO_PITCH_BOULDER_ULTA_ID) {
    return PitchPackSnapshotSchema.parse(DEMO_PITCH_BOULDER_ULTA);
  }
  return null;
}
