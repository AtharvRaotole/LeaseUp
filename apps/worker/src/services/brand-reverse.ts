import type {
  BrandReverseOpportunity,
  BrandReverseResponse,
  BrandReverseSource,
  HeatmapCell,
  TrackedBrand,
} from '@leaseup/contracts';
import type { Env } from '../index';
import { QlooClient, type QlooHeatmapCell, type QlooLocation } from '../providers/qloo';
import { NominatimClient } from './nominatim';
import { createStoreCatalog, type StoreCatalog } from './store-catalog';
import { getMetro, type MetroDefinition } from '../data/metros';
import { TRACKED_BRAND_IDS } from '../data/tracked-brand-ids';
import { displayBrandName } from '../lib/brand-display';
import { minGapKmForBrand } from '../lib/brand-gap-distance';
import { DemoModeRequiredError } from '../lib/demo-mode';
import { UpstreamError } from '../lib/errors';
import { brandReverseChicagoDemo } from '@leaseup/fixtures';

const DEFAULT_NOMINATIM_CONTACT =
  'LeaseUp/1.0 (+https://github.com/AtharvRaotole/LeaseUp)';

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

function metroQlooLocation(metro: MetroDefinition): QlooLocation {
  return {
    kind: 'point',
    latitude: metro.latitude,
    longitude: metro.longitude,
    radiusKm: metro.radiusKm,
  };
}

function toHeatmapCells(cells: QlooHeatmapCell[]): HeatmapCell[] {
  return cells.map((c) => ({
    latitude: c.latitude,
    longitude: c.longitude,
    affinity: c.affinity,
    affinityRank: c.affinity_rank,
  }));
}

function buildReportPath(lat: number, lng: number): string {
  const params = new URLSearchParams();
  params.set('address', `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  params.set('radius', '10');
  return `/r/site?${params.toString()}`;
}

export class BrandReverseService {
  private qloo: QlooClient;
  private nominatim: NominatimClient;
  private catalog: StoreCatalog;
  private mode: 'live' | 'demo';

  constructor(env: Env) {
    this.mode = env.APP_MODE === 'live' ? 'live' : 'demo';
    this.qloo = new QlooClient(env);
    this.nominatim = new NominatimClient(
      env.CACHE,
      env.NOMINATIM_CONTACT || DEFAULT_NOMINATIM_CONTACT
    );
    this.catalog = createStoreCatalog(env, this.mode);
  }

  listBrands(search?: string): TrackedBrand[] {
    const q = search?.trim().toLowerCase();
    const rows: TrackedBrand[] = [];
    for (const entityId of TRACKED_BRAND_IDS) {
      const displayName = displayBrandName(entityId, entityId);
      const name = displayName;
      if (q && !displayName.toLowerCase().includes(q) && !entityId.toLowerCase().includes(q)) {
        continue;
      }
      rows.push({ entityId, name, displayName });
    }
    rows.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return rows;
  }

  async analyze(entityId: string, metroId: string, runId?: string): Promise<BrandReverseResponse> {
    if (!TRACKED_BRAND_IDS.includes(entityId)) {
      throw new Error('Brand is not in the tracked set');
    }
    const metro = getMetro(metroId);
    if (!metro) {
      throw new Error('Unknown metro');
    }

    const brand: TrackedBrand = {
      entityId,
      name: displayBrandName(entityId, entityId),
      displayName: displayBrandName(entityId, entityId),
    };

    const location = metroQlooLocation(metro);
    let source: BrandReverseSource = 'heatmap';
    let sourceNote: string | undefined;
    let cells: QlooHeatmapCell[];

    if (this.mode === 'demo' && metro.id === 'chicago') {
      cells = brandReverseChicagoDemo.cells;
      source = brandReverseChicagoDemo.source;
      sourceNote = brandReverseChicagoDemo.sourceNote;
    } else {
      try {
        cells = await this.qloo.getHeatmap({
          location,
          entityId,
          runId,
        });
      } catch (err) {
        if (this.mode === 'demo') {
          throw new DemoModeRequiredError();
        }
        if (err instanceof UpstreamError) {
          source = 'grid_insights';
          sourceNote =
            'Qloo heatmap was unavailable for this metro. Showing affinity estimated on a point grid instead.';
          cells = await this.qloo.getAffinityGrid({
            location,
            entityId,
            gridSize: 6,
            runId,
          });
        } else {
          throw err;
        }
      }

      if (cells.length === 0) {
        source = 'grid_insights';
        sourceNote =
          'Qloo returned no heatmap cells. Showing affinity estimated on a point grid instead.';
        cells = await this.qloo.getAffinityGrid({
          location,
          entityId,
          gridSize: 6,
          runId,
        });
      }
    }

    const storesRaw = await this.catalog.findStoresNearby(
      entityId,
      metro.latitude,
      metro.longitude,
      metro.radiusKm
    );
    const stores = storesRaw.map((s) => ({ latitude: s.lat, longitude: s.lon }));

    const nationalCount = await this.catalog.getNationalStoreCount(entityId);
    const minGapKm = minGapKmForBrand(nationalCount);

    const ranked = [...cells].sort(
      (a, b) => (b.affinity ?? b.affinity_rank) - (a.affinity ?? a.affinity_rank)
    );

    const opportunities: BrandReverseOpportunity[] = [];
    for (const cell of ranked) {
      if (opportunities.length >= 10) break;
      let nearest = Infinity;
      for (const store of stores) {
        const d = haversineKm(cell.latitude, cell.longitude, store.latitude, store.longitude);
        if (d < nearest) nearest = d;
      }
      if (stores.length > 0 && nearest < minGapKm) continue;

      const neighborhood = await this.nominatim.reverseGeocode(cell.latitude, cell.longitude);
      opportunities.push({
        rank: opportunities.length + 1,
        latitude: cell.latitude,
        longitude: cell.longitude,
        affinity: cell.affinity,
        affinityRank: cell.affinity_rank,
        neighborhood,
        nearestStoreKm: nearest === Infinity ? undefined : Math.round(nearest * 10) / 10,
        reportPath: buildReportPath(cell.latitude, cell.longitude),
      });
    }

    if (opportunities.length === 0 && cells.length > 0 && this.mode === 'demo') {
      const cell = ranked[0]!;
      const neighborhood = await this.nominatim.reverseGeocode(cell.latitude, cell.longitude);
      opportunities.push({
        rank: 1,
        latitude: cell.latitude,
        longitude: cell.longitude,
        affinity: cell.affinity,
        affinityRank: cell.affinity_rank,
        neighborhood,
        reportPath: buildReportPath(cell.latitude, cell.longitude),
      });
      sourceNote = [sourceNote, 'Demo shows the top cell even when ATP stores are nearby.']
        .filter(Boolean)
        .join(' ');
    }

    return {
      brand,
      metro: { id: metro.id, label: metro.label },
      source,
      sourceNote,
      cells: toHeatmapCells(cells),
      stores,
      opportunities,
      mode: this.mode,
    };
  }
}
