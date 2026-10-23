import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { apiUrl } from '../../lib/api';
import { heatmapWeightsFromAffinity } from '../../lib/heatmap-scale';
import { Switch } from '../ui/Switch';

function mapStyle() {
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
  }
  return 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
}

export default function ReportMapInner({
  results,
  selectedProspect,
  radiusKm,
}: {
  results: AnalysisResponse;
  selectedProspect: ProspectPack | null;
  radiusKm: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showStores, setShowStores] = useState(true);
  const [showRadius, setShowRadius] = useState(true);
  const [tick, setTick] = useState(0);

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
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [results.location.latitude, results.location.longitude]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !showStores) return;
    const stores = results.mapStores ?? [];
    const geojson: FeatureCollection<Point> = {
      type: 'FeatureCollection',
      features: stores.map((store) => ({
        type: 'Feature',
        properties: { brand: store.brandName },
        geometry: { type: 'Point', coordinates: [store.longitude, store.latitude] },
      })),
    };
    const onLoad = () => {
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
    };
    if (!map.isStyleLoaded()) map.once('load', onLoad);
    else onLoad();
  }, [results.mapStores, showStores, tick]);

  useEffect(() => {
    if (!selectedProspect || !mapRef.current) return;
    const stores = results.mapStores?.filter((s) => s.entityId === selectedProspect.brand.entityId);
    if (stores?.[0]) {
      mapRef.current.flyTo({ center: [stores[0].longitude, stores[0].latitude], zoom: 13, essential: true });
    }
  }, [selectedProspect, results.mapStores]);

  useEffect(() => {
    if (!selectedProspect || !results.heatmapAvailable) return;
    const params = new URLSearchParams({
      entityId: selectedProspect.brand.entityId,
      lat: String(results.location.latitude),
      lng: String(results.location.longitude),
      radius: String(radiusKm),
      address: results.location.address,
    });
    void fetch(apiUrl(`/api/heatmap?${params}`))
      .then((r) => r.json())
      .then((data) => {
        if (!data.available || !data.cells?.length) return;
        const affinities = data.cells.map((c: { affinity?: number; affinityRank?: number }) => c.affinity ?? c.affinityRank ?? 0);
        const weights = heatmapWeightsFromAffinity(affinities);
        const map = mapRef.current;
        if (!map) return;
        const features = data.cells.map((c: { latitude: number; longitude: number }, i: number) => ({
          type: 'Feature' as const,
          properties: { weight: weights[i] ?? 0 },
          geometry: { type: 'Point' as const, coordinates: [c.longitude, c.latitude] },
        }));
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
        setShowHeatmap(true);
        setTick((t) => t + 1);
      })
      .catch(() => undefined);
  }, [selectedProspect, results, radiusKm]);

  return (
    <div className="relative h-full min-h-[360px] w-full">
      <div className="absolute left-3 top-3 z-10 rounded-card border border-border bg-surface/95 p-3 text-xs shadow-pop space-y-2">
        <p className="font-medium text-ink">{selectedProspect?.brand.name ?? 'Map'}</p>
        <Switch checked={showHeatmap} onCheckedChange={setShowHeatmap} label="Taste heat" />
        <Switch checked={showStores} onCheckedChange={setShowStores} label="Stores" />
        <Switch checked={showRadius} onCheckedChange={setShowRadius} label="Radius" />
        <p className="text-ink-3">More affinity to less</p>
      </div>
      <div ref={containerRef} className="h-full w-full rounded-card border border-border overflow-hidden" />
    </div>
  );
}
