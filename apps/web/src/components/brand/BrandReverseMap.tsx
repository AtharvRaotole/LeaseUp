import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { BrandReverseResponse } from '@leaseup/contracts';
import { heatmapWeightsFromAffinity } from '../../lib/heatmap-scale';

function mapStyle() {
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
  }
  return 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
}

export function BrandReverseMap({
  data,
  highlight,
}: {
  data: BrandReverseResponse;
  highlight?: { latitude: number; longitude: number };
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle(),
      center: [data.metro.id === 'chicago' ? -87.6298 : -87.6298, 41.8781],
      zoom: 9,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [data.metro.id]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const onLoad = () => {
      const affinities = data.cells.map((c) => c.affinity ?? c.affinityRank);
      const weights = heatmapWeightsFromAffinity(affinities);
      const features = data.cells.map((cell, i) => ({
        type: 'Feature' as const,
        properties: { weight: weights[i] ?? 0.5 },
        geometry: {
          type: 'Point' as const,
          coordinates: [cell.longitude, cell.latitude],
        },
      }));

      const heatGeo = { type: 'FeatureCollection' as const, features };
      if (map.getSource('brand-heatmap')) {
        (map.getSource('brand-heatmap') as maplibregl.GeoJSONSource).setData(heatGeo);
      } else {
        map.addSource('brand-heatmap', { type: 'geojson', data: heatGeo });
        map.addLayer({
          id: 'brand-heatmap',
          type: 'heatmap',
          source: 'brand-heatmap',
          paint: {
            'heatmap-weight': ['get', 'weight'],
            'heatmap-intensity': 0.6,
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0,
              'rgba(15, 107, 79, 0)',
              0.4,
              'rgba(15, 107, 79, 0.55)',
              1,
              'rgba(63, 191, 143, 0.95)',
            ],
          },
        });
      }

      const storeFeatures = data.stores.map((s) => ({
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'Point' as const,
          coordinates: [s.longitude, s.latitude],
        },
      }));
      const storeGeo = { type: 'FeatureCollection' as const, features: storeFeatures };
      if (map.getSource('brand-stores')) {
        (map.getSource('brand-stores') as maplibregl.GeoJSONSource).setData(storeGeo);
      } else {
        map.addSource('brand-stores', { type: 'geojson', data: storeGeo });
        map.addLayer({
          id: 'brand-stores',
          type: 'circle',
          source: 'brand-stores',
          paint: {
            'circle-radius': 5,
            'circle-color': '#0f6b4f',
            'circle-stroke-width': 1,
            'circle-stroke-color': '#ffffff',
          },
        });
      }

      const bounds = new maplibregl.LngLatBounds();
      for (const cell of data.cells) bounds.extend([cell.longitude, cell.latitude]);
      for (const store of data.stores) bounds.extend([store.longitude, store.latitude]);
      if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 48, maxZoom: 11 });
    };

    if (map.loaded()) onLoad();
    else map.once('load', onLoad);
  }, [data]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !highlight) return;
    new maplibregl.Marker({ color: '#3fbf8f' })
      .setLngLat([highlight.longitude, highlight.latitude])
      .addTo(map);
  }, [highlight]);

  return <div ref={containerRef} className="h-full min-h-[420px] w-full rounded-card" />;
}
