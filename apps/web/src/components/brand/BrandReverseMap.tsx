import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type { BrandReverseResponse } from '@leaseup/contracts';
import { heatmapWeightsFromAffinityRanks } from '../../lib/heatmap-scale';

function mapStyle() {
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
  }
  return 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
}

function pinHtml(rank: number, active: boolean): string {
  const bg = active ? '#3fbf8f' : '#0f6b4f';
  return `<div style="width:28px;height:28px;border-radius:9999px;background:${bg};color:#fff;font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.25);font-family:Geist,sans-serif">${rank}</div>`;
}

export function BrandReverseMap({
  data,
  highlightRank,
  onHoverRank,
}: {
  data: BrandReverseResponse;
  highlightRank?: number | null;
  onHoverRank?: (rank: number | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle(),
      center: [-87.6298, 41.8781],
      zoom: 9,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);
    map.once('load', () => map.resize());
    return () => {
      ro.disconnect();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const onLoad = () => {
      const ranks = data.cells.map((c) => c.affinityRank);
      const weights = heatmapWeightsFromAffinityRanks(ranks);
      const features = data.cells.map((cell, i) => ({
        type: 'Feature' as const,
        properties: { weight: weights[i] ?? 0 },
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
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 8, 0.35, 12, 1.2],
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 8, 12, 12, 28],
            'heatmap-opacity': 0.85,
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0,
              'rgba(15, 107, 79, 0)',
              0.15,
              'rgba(15, 107, 79, 0.08)',
              0.45,
              'rgba(15, 107, 79, 0.45)',
              0.75,
              'rgba(63, 191, 143, 0.75)',
              1,
              'rgba(63, 191, 143, 0.98)',
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
            'circle-radius': 4,
            'circle-color': '#64748b',
            'circle-stroke-width': 1,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.85,
          },
        });
      }

      const bounds = new maplibregl.LngLatBounds();
      for (const cell of data.cells) bounds.extend([cell.longitude, cell.latitude]);
      for (const store of data.stores) bounds.extend([store.longitude, store.latitude]);
      if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 56, maxZoom: 11 });
    };

    if (map.loaded()) onLoad();
    else map.once('load', onLoad);
  }, [data]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const opp of data.opportunities) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'brand-opp-pin';
      el.dataset.rank = String(opp.rank);
      el.innerHTML = pinHtml(opp.rank, false);
      el.addEventListener('mouseenter', () => onHoverRank?.(opp.rank));
      el.addEventListener('mouseleave', () => onHoverRank?.(null));
      el.addEventListener('click', () => onHoverRank?.(opp.rank));
      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([opp.longitude, opp.latitude])
        .addTo(map);
      // MapLibre overwrites aria-label with "Map marker" in the constructor.
      el.setAttribute('aria-label', `Opportunity ${opp.rank}`);
      markersRef.current.push(marker);
    }
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, [data.opportunities, onHoverRank]);

  // Update highlight in place instead of recreating every marker on hover.
  useEffect(() => {
    for (const m of markersRef.current) {
      const el = m.getElement();
      const rank = Number(el.dataset.rank);
      el.innerHTML = pinHtml(rank, highlightRank === rank);
      el.style.zIndex = highlightRank === rank ? '2' : '';
    }
  }, [highlightRank, data.opportunities]);

  return (
    <div className="relative h-full min-h-[360px] w-full">
      <div ref={containerRef} className="absolute inset-0 rounded-card" />
      <div
        className="pointer-events-none absolute bottom-3 left-3 rounded-control border border-border bg-surface/90 px-3 py-2 text-xs text-ink-2 shadow-sm"
        aria-hidden
      >
        <p className="text-label uppercase text-ink-3">Taste intensity</p>
        <div
          className="mt-1 h-2 w-28 rounded-full"
          style={{
            background:
              'linear-gradient(90deg, rgba(15,107,79,0) 0%, rgba(15,107,79,0.5) 50%, rgba(63,191,143,1) 100%)',
          }}
        />
        <p className="mt-1">Low to high affinity</p>
      </div>
    </div>
  );
}
