import type { DemoFixtureId } from './demo-chip-addresses';

export const DEMO_CHIP_META: Record<
  DemoFixtureId,
  { neighborhood: string; city: string }
> = {
  wicker: { neighborhood: 'Wicker Park', city: 'Chicago' },
  boulder: { neighborhood: 'Pearl Street', city: 'Boulder' },
  sevierville: { neighborhood: 'Sevierville', city: 'Tennessee' },
};

export function demoChipHeadline(chipId: DemoFixtureId): string {
  const row = DEMO_CHIP_META[chipId];
  return `${row.neighborhood}, ${row.city}`;
}
