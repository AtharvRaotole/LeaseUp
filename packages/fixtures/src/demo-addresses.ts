/** Exact demo chip addresses — only these resolve to recorded fixtures in demo mode. */
export const DEMO_CHIP_ADDRESSES = {
  wicker: '1574 N Milwaukee Ave, Chicago, IL 60622',
  boulder: '1125 Pearl St, Boulder, CO 80302',
  sevierville: '125 Collier Dr, Sevierville, TN 37862',
} as const;

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
  return null;
}
