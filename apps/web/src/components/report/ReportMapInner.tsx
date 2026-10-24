import 'maplibre-gl/dist/maplibre-gl.css';
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type RefObject } from 'react';
import { ChevronDown } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import type { AnalysisResponse } from '@leaseup/contracts';
import { apiUrl } from '../../lib/api';
import { heatmapWeightsFromAffinity } from '../../lib/heatmap-scale';
import { HEATMAP_COLOR_EXPRESSION } from '../../lib/heatmap-map-paint';
import { Switch } from '../ui/Switch';
import { cn } from '../../lib/cn';
import { mapMarkerColor } from '../../lib/map-accent';
import type { MapBrandSelection, ReportMapCaptureRef } from './ReportMap';

const MAP_LEGEND_OPEN_MIN_WIDTH_PX = 1600;

function mapStyle() {
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
  }
  return 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
}

export default function ReportMapInner({
  results,
  selectedBrand,
  pitchBrandIds,
  radiusKm,
  captureRef,
}: {
  results: AnalysisResponse;
  selectedBrand: MapBrandSelection | null;
  pitchBrandIds: string[];
  radiusKm: number;
  captureRef?: RefObject<ReportMapCaptureRef | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showStores, setShowStores] = useState(true);
  const [showRadius, setShowRadius] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [legendOpen, setLegendOpen] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia(`(min-width: ${MAP_LEGEND_OPEN_MIN_WIDTH_PX}px)`).matches
  );

  const pitchIdSet = useMemo(() => new Set(pitchBrandIds), [pitchBrandIds]);

  const resizeMap = useCallback(() => {
    mapRef.current?.resize();
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle(),
      center: [results.location.longitude, results.location.latitude],
      zoom: 12,
      preserveDrawingBuffer: true,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    new maplibregl.Marker({ color: mapMarkerColor() })
      .setLngLat([results.location.longitude, results.location.latitude])
      .addTo(map);
    map.on('load', () => {
      const pin: FeatureCollection<Point> = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Point',
              coordinates: [results.location.longitude, results.location.latitude],
            },
          },
        ],
      };
      map.addSource('site-pin', { type: 'geojson', data: pin });
      map.addLayer({
        id: 'site-pin',
        type: 'circle',
        source: 'site-pin',
        paint: {
          'circle-radius': 8,
          'circle-color': mapMarkerColor(),
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
      map.resize();
      setMapReady(true);
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [results.location.latitude, results.location.longitude]);

  const loadHeatmapForEntity = useCallback(
    async (entityId: string): Promise<boolean> => {
      if (results.heatmapAvailable !== true) return false;
      const map = mapRef.current;
      if (!map || !mapReady) return false;
      const params = new URLSearchParams({
        entityId,
        lat: String(results.location.latitude),
        lng: String(results.location.longitude),
        radius: String(radiusKm),
        address: results.location.address,
      });
      try {
        const data = await fetch(apiUrl(`/api/heatmap?${params}`)).then((r) => r.json());
        if (!data.available || !data.cells?.length) return false;
        const affinities = data.cells.map(
          (c: { affinity?: number; affinityRank?: number }) => c.affinity ?? c.affinityRank ?? 0
        );
        const weights = heatmapWeightsFromAffinity(affinities);
        const features = data.cells.map(
          (c: { latitude: number; longitude: number }, i: number) => ({
            type: 'Feature' as const,
            properties: { weight: weights[i] ?? 0 },
            geometry: { type: 'Point' as const, coordinates: [c.longitude, c.latitude] },
          })
        );
        const geojson: FeatureCollection<Point> = { type: 'FeatureCollection', features };
        if (map.getSource('heatmap')) {
          (map.getSource('heatmap') as maplibregl.GeoJSONSource).setData(geojson);
        } else {
          map.addSource('heatmap', { type: 'geojson', data: geojson });
          map.addLayer({
            id: 'heatmap',
            type: 'heatmap',
            source: 'heatmap',
            paint: {
              'heatmap-weight': ['get', 'weight'],
              'heatmap-intensity': 0.5,
              'heatmap-color': [...HEATMAP_COLOR_EXPRESSION],
            },
          });
        }
        map.setLayoutProperty('heatmap', 'visibility', 'visible');
        resizeMap();
        await new Promise<void>((resolve) => {
          map.once('idle', () => resolve());
          window.setTimeout(() => resolve(), 1200);
        });
        return true;
      } catch {
        return false;
      }
    },
    [mapReady, radiusKm, resizeMap, results]
  );

  const readCanvasSnapshot = useCallback((): string | null => {
    const canvas = mapRef.current?.getCanvas();
    if (!canvas || !mapReady) return null;
    try {
      return canvas.toDataURL('image/jpeg', 0.85);
    } catch {
      return null;
    }
  }, [mapReady]);

  useImperativeHandle(
    captureRef,
    () => ({
      captureSnapshot: readCanvasSnapshot,
      capturePitchSnapshot: async () => {
        const map = mapRef.current;
        setShowStores(true);
        setShowHeatmap(true);
        const entityId = selectedBrand?.entityId ?? pitchBrandIds[0];
        if (entityId && results.heatmapAvailable === true) {
          await loadHeatmapForEntity(entityId);
          if (map?.getLayer('heatmap')) {
            map.setLayoutProperty('heatmap', 'visibility', 'visible');
          }
        }
        if (map) {
          await new Promise<void>((resolve) => {
            map.once('idle', () => resolve());
            window.setTimeout(() => resolve(), 1500);
          });
        }
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        return readCanvasSnapshot();
      },
    }),
    [loadHeatmapForEntity, pitchBrandIds, readCanvasSnapshot, selectedBrand?.entityId]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => resizeMap());
    ro.observe(el);
    return () => ro.disconnect();
  }, [resizeMap]);

  useEffect(() => {
    if (mapReady) resizeMap();
  }, [mapReady, resizeMap]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const visibility = showStores ? 'visible' : 'none';
    if (map.getLayer('stores-pitch')) map.setLayoutProperty('stores-pitch', 'visibility', visibility);
    if (map.getLayer('stores-other')) map.setLayoutProperty('stores-other', 'visibility', visibility);
  }, [showStores, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const stores = results.mapStores ?? [];
    const pitchFeatures = stores
      .filter((s) => pitchIdSet.has(s.entityId))
      .map((store) => ({
        type: 'Feature' as const,
        properties: { brand: store.brandName },
        geometry: { type: 'Point' as const, coordinates: [store.longitude, store.latitude] },
      }));
    const otherFeatures = stores
      .filter((s) => !pitchIdSet.has(s.entityId))
      .map((store) => ({
        type: 'Feature' as const,
        properties: { brand: store.brandName },
        geometry: { type: 'Point' as const, coordinates: [store.longitude, store.latitude] },
      }));

    const upsert = (id: string, data: FeatureCollection<Point>, color: string) => {
      if (map.getSource(id)) {
        (map.getSource(id) as maplibregl.GeoJSONSource).setData(data);
      } else {
        map.addSource(id, { type: 'geojson', data });
        map.addLayer({
          id,
          type: 'circle',
          source: id,
          paint: {
            'circle-radius': 5,
            'circle-color': color,
            'circle-stroke-width': 1,
            'circle-stroke-color': '#ffffff',
          },
        });
      }
    };

    upsert('stores-pitch', { type: 'FeatureCollection', features: pitchFeatures }, mapMarkerColor());
    upsert('stores-other', { type: 'FeatureCollection', features: otherFeatures }, '#8fa3c4');
    resizeMap();
  }, [results.mapStores, mapReady, resizeMap, pitchIdSet]);

  useEffect(() => {
    if (!selectedBrand || !mapRef.current) return;
    const stores = results.mapStores?.filter((s) => s.entityId === selectedBrand.entityId);
    if (stores?.[0]) {
      mapRef.current.flyTo({ center: [stores[0].longitude, stores[0].latitude], zoom: 13, essential: true });
    }
  }, [selectedBrand, results.mapStores]);

  const heatmapAllowed = results.heatmapAvailable === true && !!selectedBrand;

  useEffect(() => {
    if (!heatmapAllowed || !showHeatmap || !selectedBrand) return;
    void loadHeatmapForEntity(selectedBrand.entityId);
  }, [selectedBrand, showHeatmap, heatmapAllowed, loadHeatmapForEntity]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer('heatmap')) return;
    map.setLayoutProperty('heatmap', 'visibility', showHeatmap && heatmapAllowed ? 'visible' : 'none');
  }, [showHeatmap, heatmapAllowed]);

  useEffect(() => {
    if (selectedBrand && results.heatmapAvailable) {
      setShowHeatmap(true);
    }
  }, [selectedBrand?.entityId, results.heatmapAvailable]);

  return (
    <div className="relative h-full min-h-[520px] w-full">
      <div className="absolute right-3 top-3 z-10 w-[min(100%,260px)] rounded-card border border-border bg-surface p-3.5 shadow-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-3">Map</p>
        <div className="grid grid-cols-1 gap-y-2">
          <Switch
            checked={showHeatmap && heatmapAllowed}
            onCheckedChange={(v) => setShowHeatmap(v)}
            label="Shopper demand"
            disabled={!heatmapAllowed}
            title={!selectedBrand ? 'Pick a brand to see where demand is strongest' : undefined}
          />
          <Switch checked={showStores} onCheckedChange={setShowStores} label="Stores" />
          <Switch checked={showRadius} onCheckedChange={setShowRadius} label="Radius" />
        </div>
        <button
          type="button"
          className="mt-3 flex w-full items-center justify-between gap-2 rounded-md border border-transparent py-1 text-left text-[11px] font-semibold text-ink hover:border-border/60 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          onClick={() => setLegendOpen((o) => !o)}
          aria-expanded={legendOpen}
          aria-controls="report-map-legend-panel"
          data-testid="report-map-legend-toggle"
        >
          <span>Legend</span>
          <ChevronDown
            className={cn('h-4 w-4 shrink-0 text-ink-3 transition-transform', legendOpen && 'rotate-180')}
            aria-hidden
          />
        </button>
        <div id="report-map-legend-panel" className={cn(!legendOpen && 'hidden')} data-testid="report-map-legend-panel">
            <div className="mt-2 grid grid-cols-[auto_1fr_auto] items-center gap-x-2 pr-1">
              <span className="text-[10px] leading-none text-ink-3">Less</span>
              <div
                className="h-2 min-w-0 w-full rounded-pill"
                style={{
                  background: 'linear-gradient(90deg, #fff4d6, #fdba74, #f97316, #c2410c)',
                }}
              />
              <span className="text-[10px] leading-none text-ink-3">More</span>
            </div>
            <ul className="mt-2 space-y-1.5 text-[10px] text-ink-3">
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-hidden />
                Your pin
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#8fa3c4]" aria-hidden />
                Nearby stores of top brands
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-accent/30" aria-hidden />
                Pitch brand stores
              </li>
            </ul>
        </div>
      </div>
      <div
        ref={containerRef}
        className="!absolute inset-0 w-full rounded-card border border-border overflow-hidden"
      />
    </div>
  );
}
