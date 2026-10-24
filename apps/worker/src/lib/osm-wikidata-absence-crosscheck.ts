import { overpassDemoByFixture, type DemoFixtureId } from '@leaseup/fixtures/worker';
import { OSM_WIKIDATA_BY_ENTITY } from '../data/osm-wikidata-map';
import { displayBrandName } from './brand-display';
import {
  overpassBrandMatchesSearch,
  type OverpassBrandHit,
} from './osm-brand-match';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

let aliasByEntityId: Record<string, string> | null = null;

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

function aliasNamesForEntity(entityId: string): string[] {
  if (!aliasByEntityId) {
    const resolved = join(REPO_ROOT, 'data/brands/display-aliases.json');
    if (existsSync(resolved)) {
      const raw = JSON.parse(readFileSync(resolved, 'utf8')) as Record<string, string>;
      aliasByEntityId = {};
      for (const [key, value] of Object.entries(raw)) {
        if (/^[0-9A-F-]{36}$/i.test(key)) {
          aliasByEntityId[key.toUpperCase()] = value;
        }
      }
    } else {
      aliasByEntityId = {};
    }
  }
  const alias = aliasByEntityId[entityId.toUpperCase()];
  return alias ? [alias] : [];
}

export function overpassSearchForEntity(entityId: string, qlooName?: string) {
  const name = displayBrandName(entityId, qlooName ?? '');
  const aliases = [...aliasNamesForEntity(entityId)];
  if (qlooName && qlooName !== name) aliases.push(qlooName);
  return {
    name,
    wikidata: OSM_WIKIDATA_BY_ENTITY[entityId],
    aliases,
  };
}

/** Nearest OSM hit (demo Overpass recording) matching brand:wikidata / aliases within radius. */
export function nearestDemoOverpassMatchKm(
  fixtureId: DemoFixtureId,
  entityId: string,
  lat: number,
  lon: number,
  radiusKm: number,
  qlooName?: string
): number | undefined {
  const recording = overpassDemoByFixture[fixtureId];
  if (!recording?.brands?.length) return undefined;
  const search = overpassSearchForEntity(entityId, qlooName);
  let nearest = Infinity;
  for (const hit of recording.brands) {
    if (!overpassBrandMatchesSearch(hit as OverpassBrandHit, search)) continue;
    const d = haversineKm(lat, lon, hit.lat, hit.lon);
    if (d <= radiusKm && d < nearest) nearest = d;
  }
  return nearest === Infinity ? undefined : nearest;
}
