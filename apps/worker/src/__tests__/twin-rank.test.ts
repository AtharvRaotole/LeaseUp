import { describe, expect, it } from 'vitest';
import panel from '../lib/taste-twin-panel.json';
import coefficients from '../lib/twin-rank-coefficients.json';
import { findTasteTwins, twinPresenceShare } from '../lib/taste-twins';
import { orderInsightsByTwinBlend, twinRankScore } from '../lib/twin-rank';
import { orderInsightsForSite } from '../lib/analysis-enrichment';
import { defaultLogisticSiteContext } from '@leaseup/fixtures/worker';

type Site = { id: string; lat: number; lon: number; dev: Array<number | null> };
const sites = panel.sites as Site[];
const brands = panel.brands as string[];
const bm = panel.brandMeanZ as number[];
function insightsFor(site: Site) {
  return site.dev.flatMap((d, i) =>
    d === null ? [] : [{ entity_id: brands[i]!, name: brands[i]!, query: { affinity: 0.5 + 0.1 * (d + bm[i]!) } }]
  );
}

describe('taste twin ranking', () => {
  it('ships positive per brand coefficients from the 40 site fit', () => {
    expect(coefficients.features).toEqual(['logChainSize', 'qlooAffinityZ', 'twinShare']);
    for (const value of Object.values(coefficients.coefficients)) expect(value).toBeGreaterThan(0);
    const base = { logChainSize: 6, qlooAffinityZ: 0, twinShare: 0.2 };
    expect(twinRankScore({ ...base, twinShare: 0.8 })).toBeGreaterThan(twinRankScore(base));
  });

  it('ranks a brand higher when more taste twins already host it, all else equal', () => {
    const wb = sites.find((s) => s.id === 'nyc_williamsburg')!;
    const insights = insightsFor(wb);
    const set = findTasteTwins(wb.lat, wb.lon, insights, 5, { excludePanelIds: new Set([wb.id]) })!;
    const ordered = orderInsightsByTwinBlend(insights, set);
    expect(ordered).toHaveLength(insights.length);
    expect(ordered.map((r) => r.blendedRank)).toEqual(ordered.map((_, i) => i + 1));
    const top = ordered.slice(0, 20).map((r) => r.twinShare ?? 0);
    const bottom = ordered.slice(-20).map((r) => r.twinShare ?? 0);
    const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    expect(avg(top)).toBeGreaterThan(avg(bottom));
    expect(twinPresenceShare('not-a-panel-brand', set)).toBeUndefined();
  });

  it('uses the twin blend for live addresses and keeps demo chips on the standard blend', () => {
    const boulder = sites.find((s) => s.id === 'boulder_co')!;
    const insights = insightsFor(boulder);
    const live = orderInsightsForSite(
      insights,
      { latitude: 40.6872, longitude: -73.9418, address: '1000 Bedford Ave, Brooklyn, NY' },
      defaultLogisticSiteContext('urban', 3)
    );
    expect(live.model).toBe('taste_twins');
    expect(live.twins?.twins).toHaveLength(5);
    const tooFew = orderInsightsForSite(
      insights.slice(0, 10),
      { latitude: 40.6872, longitude: -73.9418, address: '1000 Bedford Ave, Brooklyn, NY' },
      defaultLogisticSiteContext('urban', 3)
    );
    expect(tooFew.model).toBe('standard');
  });
});
