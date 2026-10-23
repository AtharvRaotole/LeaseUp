import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';

interface TasteMapProps {
  results: AnalysisResponse;
  selectedProspect: ProspectPack | null;
  onSelectProspect: (prospect: ProspectPack) => void;
}

export function TasteMap({ results, selectedProspect, onSelectProspect }: TasteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapCells, setHeatmapCells] = useState<
    Array<{ latitude: number; longitude: number; affinityRank: number }>
  >([]);

  const heatmapToggleVisible = results.heatmapAvailable === true;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [results.location.longitude, results.location.latitude],
      zoom: 12,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    new maplibregl.Marker({ color: '#8b5cf6' })
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
    if (!map) return;

    const stores = results.mapStores ?? [];
    const geojson: FeatureCollection<Point> = {
      type: 'FeatureCollection',
      features: stores.map((store) => ({
        type: 'Feature',
        properties: {
          brand: store.brandName,
          distanceKm: store.distanceKm,
        },
        geometry: {
          type: 'Point',
          coordinates: [store.longitude, store.latitude],
        },
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
          'circle-radius': 6,
          'circle-color': '#22d3ee',
          'circle-stroke-width': 1,
          'circle-stroke-color': '#0a0a0b',
        },
      });
    }
  }, [results.mapStores]);

  useEffect(() => {
    if (!selectedProspect || !mapRef.current) return;

    const stores = results.mapStores?.filter((s) => s.entityId === selectedProspect.brand.entityId);
    if (stores && stores.length > 0) {
      const target = stores[0]!;
      mapRef.current.flyTo({
        center: [target.longitude, target.latitude],
        zoom: 13,
        essential: true,
      });
    }
  }, [selectedProspect, results.mapStores]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !showHeatmap || heatmapCells.length === 0) return;

    const geojson: FeatureCollection<Point> = {
      type: 'FeatureCollection',
      features: heatmapCells.map((cell) => ({
        type: 'Feature',
        properties: { weight: cell.affinityRank },
        geometry: {
          type: 'Point',
          coordinates: [cell.longitude, cell.latitude],
        },
      })),
    };

    if (!map.getSource('heatmap')) {
      map.addSource('heatmap', { type: 'geojson', data: geojson });
      map.addLayer({
        id: 'heatmap',
        type: 'heatmap',
        source: 'heatmap',
        paint: {
          'heatmap-weight': ['get', 'weight'],
          'heatmap-intensity': 0.6,
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(0,0,0,0)',
            0.4,
            '#6d28d9',
            1,
            '#c4b5fd',
          ],
        },
      });
    } else {
      (map.getSource('heatmap') as maplibregl.GeoJSONSource).setData(geojson);
    }
  }, [showHeatmap, heatmapCells]);

  const loadHeatmap = async (prospect: ProspectPack) => {
    if (!heatmapToggleVisible) return;
    const location =
      results.location.resolvedAddress || results.location.address;
    const params = new URLSearchParams({
      entityId: prospect.brand.entityId,
      location,
    });
    const res = await fetch(`/api/heatmap?${params.toString()}`);
    const data = await res.json();
    if (data.available && data.cells?.length) {
      setHeatmapCells(data.cells);
      setShowHeatmap(true);
    } else {
      setHeatmapCells([]);
      setShowHeatmap(false);
    }
  };

  return (
    <section className="glass rounded-2xl p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-semibold">Taste map</h3>
        {heatmapToggleVisible && selectedProspect && (
          <button
            type="button"
            className="text-sm px-3 py-1.5 rounded-lg border border-surface-border hover:border-accent"
            onClick={() => void loadHeatmap(selectedProspect)}
          >
            Load Qloo heatmap for {selectedProspect.brand.name}
          </button>
        )}
        {!heatmapToggleVisible && (
          <span className="text-xs text-zinc-500">Heatmap available in live mode when Qloo returns cells</span>
        )}
      </div>
      <div ref={containerRef} className="h-[360px] w-full rounded-xl overflow-hidden" />
      <div className="mt-3 flex flex-wrap gap-2">
        {results.prospects.slice(0, 5).map((prospect) => (
          <button
            key={prospect.brand.entityId}
            type="button"
            onClick={() => {
              onSelectProspect(prospect);
              void loadHeatmap(prospect);
            }}
            className={`text-xs px-2 py-1 rounded-full border ${
              selectedProspect?.brand.entityId === prospect.brand.entityId
                ? 'border-accent text-accent'
                : 'border-surface-border text-zinc-400'
            }`}
          >
            {prospect.brand.name}
          </button>
        ))}
      </div>
    </section>
  );
}
