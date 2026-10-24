import type { DemoFixtureId } from './demo-addresses.js';
import boulder from './trade-area-shoppers/boulder.json';
import sevierville from './trade-area-shoppers/sevierville.json';
import wicker from './trade-area-shoppers/wicker.json';

export type TradeAreaShopperFixture = typeof wicker;

const BY_DEMO: Record<'wicker' | 'boulder' | 'sevierville', TradeAreaShopperFixture> = {
  wicker,
  boulder,
  sevierville,
};

export function tradeAreaShopperFixtureForDemo(id: DemoFixtureId): TradeAreaShopperFixture | null {
  if (id === 'wicker' || id === 'boulder' || id === 'sevierville') {
    return BY_DEMO[id];
  }
  return null;
}
