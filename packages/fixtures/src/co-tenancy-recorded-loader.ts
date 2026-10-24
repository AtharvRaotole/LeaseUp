import type { DemoFixtureId } from './demo-addresses.js';
import manifest from './co-tenancy-recorded/manifest.json';

type ChipManifest = Record<string, unknown>;

const BY_DEMO = manifest as Record<'wicker' | 'boulder' | 'sevierville', ChipManifest>;

export function coTenancyRecordedRaw(
  demoId: DemoFixtureId,
  cacheKey: string
): unknown | null {
  if (demoId !== 'wicker' && demoId !== 'boulder' && demoId !== 'sevierville') {
    return null;
  }
  const chip = BY_DEMO[demoId];
  if (!chip || typeof chip !== 'object') return null;
  const raw = chip[cacheKey];
  return raw ?? null;
}
