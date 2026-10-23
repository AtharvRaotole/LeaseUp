/** Primary demo chip addresses (canonical for UI chips). */
export const DEMO_CHIP_ADDRESSES = {
  wicker: '1560 N Milwaukee Ave, Chicago, IL 60622',
  boulder: '1300 Pearl St, Boulder, CO 80302',
  sevierville: '125 Collier Dr, Sevierville, TN 37862',
} as const;

/** Legacy strings still accepted in demo mode (same recorded fixtures). */
export const LEGACY_DEMO_CHIP_ADDRESSES: Partial<Record<DemoFixtureId, string>> = {
  wicker: '1574 N Milwaukee Ave, Chicago, IL 60622',
  boulder: '1125 Pearl St, Boulder, CO 80302',
};

export type DemoFixtureId = keyof typeof DEMO_CHIP_ADDRESSES;

export function normalizeAddress(address: string): string {
  return address.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function matchDemoFixtureId(address: string): DemoFixtureId | null {
  const normalized = normalizeAddress(address);
  for (const [id, demoAddress] of Object.entries(DEMO_CHIP_ADDRESSES)) {
    if (normalizeAddress(demoAddress) === normalized) {
      return id as DemoFixtureId;
    }
  }
  for (const [id, demoAddress] of Object.entries(LEGACY_DEMO_CHIP_ADDRESSES)) {
    if (demoAddress && normalizeAddress(demoAddress) === normalized) {
      return id as DemoFixtureId;
    }
  }
  return null;
}
