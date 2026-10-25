import { describe, expect, it } from 'vitest';
import type { ProspectPack } from '@leaseup/contracts';
import panel from '../lib/taste-twin-panel.json';
import parity from './fixtures/twin-rank-parity.json';
import {
  findTasteTwins,
  siteTasteVector,
  tasteTwinEvidence,
  tasteTwinReason,
  withTasteTwinEvidence,
} from '../lib/taste-twins';

type Site = { id: string; label: string; lat: number; lon: number; dev: Array<number | null>; present: number[] };
const sites = panel.sites as Site[];
const brands = panel.brands as string[];
const bm = panel.brandMeanZ as number[];

/** Rebuild insights whose z-scores reproduce a panel site's taste vector exactly (dev + brand mean). */
function insightsFor(site: Site) {
  return site.dev.flatMap((d, i) => (d === null ? [] : [{ entity_id: brands[i]!, query: { affinity: 0.5 + 0.1 * (d + bm[i]!) } }]));
}

function pack(entityId: string): ProspectPack {
  return {
    brand: { entityId, name: 'B', affinityRank: 1 },
    reasons: ['head', 'no store', 'category'],
  } as unknown as ProspectPack;
}

describe('taste twins', () => {
  it('ships 40 panel sites over the same brand list', () => {
    expect(sites).toHaveLength(40);
    for (const s of sites) expect(s.dev).toHaveLength(brands.length);
  });

  it('recovers a site vector from raw affinities', () => {
    const site = sites.find((s) => s.id === 'boulder_co')!;
    const v = siteTasteVector(insightsFor(site));
    const i = site.dev.findIndex((d) => d !== null);
    expect(v.vector.get(i)).toBeCloseTo(site.dev[i]!, 1);
  });

  it('matches the Python eval twins on a top 50 brand pool (consistent subset z scores)', () => {
    for (const [id, expected] of Object.entries(parity as Record<string, { pool: string[]; twins: string[] }>)) {
      const site = sites.find((s) => s.id === id)!;
      const pool = new Set(expected.pool);
      const insights = insightsFor(site).filter((row) => pool.has(row.entity_id));
      expect(insights).toHaveLength(expected.pool.length);
      const set = findTasteTwins(site.lat, site.lon, insights, 5, { excludePanelIds: new Set([id]) })!;
      expect(set.twins.map((t) => t.id)).toEqual(expected.twins);
    }
  });

  it('does not match a Brooklyn top 50 run with rural western towns (Bedford regression)', () => {
    const wb = sites.find((s) => s.id === 'nyc_williamsburg')!;
    const top50 = [...insightsFor(wb)].sort((a, b) => b.query.affinity - a.query.affinity).slice(0, 50);
    const ids = findTasteTwins(40.6872, -73.9418, top50, 5, { excludePanelIds: new Set([wb.id]) })!.twins.map((t) => t.id);
    for (const rural of ['elko_nv', 'laramie_wy', 'ottumwa_ia', 'fillmore_ut', 'sedalia_mo', 'bemidji_mn']) {
      expect(ids).not.toContain(rural);
    }
  });

  it('never picks the site itself or a panel site within 50 km', () => {
    const wicker = sites.find((s) => s.id === 'chi_wicker')!;
    const set = findTasteTwins(wicker.lat, wicker.lon, insightsFor(wicker))!;
    expect(set.twins).toHaveLength(5);
    const ids = set.twins.map((t) => t.id);
    expect(ids).not.toContain('chi_wicker');
    expect(ids).not.toContain('chi_lakeview');
    expect(ids).not.toContain('naperville_il');
    const sims = set.twins.map((t) => t.similarity);
    expect([...sims].sort((a, b) => b - a)).toEqual(sims);
  });

  it('returns null when too few panel brands have affinity', () => {
    expect(findTasteTwins(40, -100, [{ entity_id: brands[0]!, query: { affinity: 0.5 } }])).toBeNull();
  });

  it('counts brand presence across the twins and only adds a reason at 3 of 5 or more', () => {
    const boulder = sites.find((s) => s.id === 'boulder_co')!;
    const set = findTasteTwins(boulder.lat, boulder.lon, insightsFor(boulder))!;
    const twinSites = set.twins.map((t) => sites.find((s) => s.id === t.id)!);
    const counts = brands.map((_, i) => twinSites.filter((s) => s.present.includes(i)).length);
    const strong = counts.findIndex((c) => c >= 3);
    const weak = counts.findIndex((c) => c < 3);
    const ev = tasteTwinEvidence(brands[strong]!, set)!;
    expect(ev.presentIn).toBe(counts[strong]);
    expect(ev.of).toBe(5);
    expect(tasteTwinReason(ev)).toMatch(/^Already trades in \d of the 5 test markets whose Qloo taste is closest to this site \(/);
    const out = withTasteTwinEvidence(pack(brands[strong]!), set);
    expect(out.reasons[2]).toBe(tasteTwinReason(ev));
    expect(out.reasons).toHaveLength(4);
    const quiet = withTasteTwinEvidence(pack(brands[weak]!), set);
    expect(quiet.tasteTwins?.presentIn).toBe(counts[weak]);
    expect(quiet.reasons).toEqual(['head', 'no store', 'category']);
  });

  it('leaves brands outside the panel and runs without a twin set untouched', () => {
    const p = pack('not-a-panel-brand');
    expect(withTasteTwinEvidence(p, null)).toBe(p);
    const boulder = sites.find((s) => s.id === 'boulder_co')!;
    expect(withTasteTwinEvidence(p, findTasteTwins(boulder.lat, boulder.lon, insightsFor(boulder)))).toBe(p);
  });
});
