import { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import type { AnalysisResponse } from '@leaseup/contracts';
import { apiUrl } from '../../lib/api';
import { heatmapWeightsFromAffinity } from '../../lib/heatmap-scale';
import { Switch } from '../ui/Switch';
import type { MapBrandSelection } from './ReportMap';

function mapStyle() {
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
  }
  return 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
}

export default function ReportMapInner({
  results,
  selectedBrand,
  radiusKm,
}: {
  results: AnalysisResponse;
  selectedBrand: MapBrandSelection | null;
  radiusKm: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showStores, setShowStores] = useState(true);
  const [showRadius, setShowRadius] = useState(true);
  const [mapReady, setMapReady] = useState(false);

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
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    new maplibregl.Marker({ color: '#0f6b4f' })
      .setLngLat([results.location.longitude, results.location.latitude])
      .addTo(map);
    map.on('load', () => {
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
    if (map.getLayer('stores')) map.setLayoutProperty('stores', 'visibility', visibility);
  }, [showStores, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const stores = results.mapStores ?? [];
    const geojson: FeatureCollection<Point> = {
      type: 'FeatureCollection',
      features: stores.map((store) => ({
        type: 'Feature',
        properties: { brand: store.brandName },
        geometry: { type: 'Point', coordinates: [store.longitude, store.latitude] },
      })),
    };
    if (map.getSource('stores')) {
      (map.getSource('stores') as maplibregl.GeoJSONSource).setData(geojson);
    } else {
      map.addSource('stores', { type: 'geojson', data: geojson });
      map.addLayer({
        id: 'stores',
        type: 'circle',
        source: 'stores',
        paint: {
          'circle-radius': 5,
          'circle-color': '#2b59c3',
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff',
        },
      });
    }
    resizeMap();
  }, [results.mapStores, mapReady, resizeMap]);

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
    const params = new URLSearchParams({
      entityId: selectedBrand.entityId,
      lat: String(results.location.latitude),
      lng: String(results.location.longitude),
      radius: String(radiusKm),
      address: results.location.address,
    });
    void fetch(apiUrl(`/api/heatmap?${params}`))
      .then((r) => r.json())
      .then((data) => {
        const map = mapRef.current;
        if (!map || !data.available || !data.cells?.length) return;
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
              'heatmap-color': [
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0,
                'rgba(255,244,214,0)',
                0.4,
                '#fdba74',
                1,
                '#c2410c',
              ],
            },
          });
        }
        map.setLayoutProperty('heatmap', 'visibility', 'visible');
        resizeMap();
      })
      .catch(() => undefined);
  }, [selectedBrand, results, radiusKm, showHeatmap, heatmapAllowed, resizeMap]);

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
      <div className="absolute left-3 top-3 z-10 w-[min(100%,240px)] rounded-card border border-border bg-surface/95 p-3 shadow-pop">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-3">Map</p>
        <div className="grid grid-cols-1 gap-y-2">
          <Switch
            checked={showHeatmap && heatmapAllowed}
            onCheckedChange={(v) => setShowHeatmap(v)}
            label="Taste heat"
            disabled={!heatmapAllowed}
            title={!selectedBrand ? 'Pick a brand to see its taste heat' : undefined}
          />
          <Switch checked={showStores} onCheckedChange={setShowStores} label="Stores" />
          <Switch checked={showRadius} onCheckedChange={setShowRadius} label="Radius" />
        </div>
        <div className="mt-3 space-y-1">
          <div
            className="h-2 w-full rounded-pill"
            style={{
              background: 'linear-gradient(90deg, #fff4d6, #fdba74, #f97316, #c2410c)',
            }}
          />
          <div className="flex justify-between text-[10px] text-ink-3">
            <span>Less</span>
            <span>More</span>
          </div>
        </div>
      </div>
      <div ref={containerRef} className="absolute inset-0 rounded-card border border-border overflow-hidden" />
    </div>
  );
}
