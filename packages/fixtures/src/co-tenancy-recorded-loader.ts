import type { DemoFixtureId } from './demo-addresses.js';
import manifest from './co-tenancy-recorded/manifest.json';

/**
 * Packed per-chip co-tenancy fixture. Incumbent ids are stored once per chip in `ids`;
 * each entry keeps the pitched brand name and its explainability shares as
 * `[index into ids, score]` pairs. Expanded back into the compact Qloo insights shape
 * by `unpackCoTenancyEntry` so the worker parses demo and live bodies the same way.
 */
export type PackedCoTenancyEntry = { n?: string; s: Array<[number, number]> };
export type PackedCoTenancyChip = { ids: string[]; entries: Record<string, PackedCoTenancyEntry> };

type ChipId = 'wicker' | 'boulder' | 'sevierville';

const BY_DEMO = manifest as unknown as Partial<Record<ChipId, PackedCoTenancyChip>>;

type CompactBody = {
  results?: {
    entities?: Array<{
      entity_id?: string;
      name?: string;
      query?: {
        explainability?: Record<string, Array<{ entity_id?: string; score?: number }>>;
      };
    }>;
  };
};

const SCORE_DIGITS = 1e4;

export function packCoTenancyChip(bodies: Record<string, unknown>): PackedCoTenancyChip {
  const ids: string[] = [];
  const index = new Map<string, number>();
  const entries: Record<string, PackedCoTenancyEntry> = {};
  for (const key of Object.keys(bodies).sort()) {
    const row = (bodies[key] as CompactBody | null)?.results?.entities?.[0];
    const shares = row?.query?.explainability?.['signal.interests.entities'];
    if (!row || !Array.isArray(shares)) continue;
    const s: Array<[number, number]> = [];
    for (const e of shares) {
      if (!e.entity_id || typeof e.score !== 'number') continue;
      let i = index.get(e.entity_id);
      if (i === undefined) {
        i = ids.length;
        ids.push(e.entity_id);
        index.set(e.entity_id, i);
      }
      s.push([i, Math.round(e.score * SCORE_DIGITS) / SCORE_DIGITS]);
    }
    entries[key] = row.name ? { n: row.name, s } : { s };
  }
  return { ids, entries };
}

export function unpackCoTenancyEntry(
  chip: PackedCoTenancyChip,
  cacheKey: string
): CompactBody | null {
  const entry = chip.entries?.[cacheKey];
  if (!entry || !Array.isArray(entry.s)) return null;
  const pitchId = cacheKey.split(':')[0] ?? '';
  return {
    results: {
      entities: [
        {
          entity_id: pitchId,
          ...(entry.n ? { name: entry.n } : {}),
          query: {
            explainability: {
              'signal.interests.entities': entry.s
                .filter(([i]) => typeof chip.ids[i] === 'string')
                .map(([i, score]) => ({ entity_id: chip.ids[i], score })),
            },
          },
        },
      ],
    },
  };
}

export function coTenancyRecordedKeys(demoId: DemoFixtureId): string[] {
  const chip = BY_DEMO[demoId as ChipId];
  return chip ? Object.keys(chip.entries ?? {}) : [];
}

export function coTenancyRecordedRaw(demoId: DemoFixtureId, cacheKey: string): unknown | null {
  if (demoId !== 'wicker' && demoId !== 'boulder' && demoId !== 'sevierville') {
    return null;
  }
  const chip = BY_DEMO[demoId];
  if (!chip || typeof chip !== 'object') return null;
  return unpackCoTenancyEntry(chip, cacheKey);
}
