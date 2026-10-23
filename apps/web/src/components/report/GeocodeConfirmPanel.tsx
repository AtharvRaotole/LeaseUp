import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import type { GeocodeCandidate, Location } from '@leaseup/contracts';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { cn } from '../../lib/cn';

function mapStyle() {
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
  }
  return 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
}

export function GeocodeConfirmPanel({
  address,
  candidates,
  onConfirm,
  onCancel,
}: {
  address: string;
  candidates: GeocodeCandidate[];
  onConfirm: (location: Location) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState(0);
  const [pin, setPin] = useState<{ lat: number; lng: number }>(() => ({
    lat: candidates[0]!.latitude,
    lng: candidates[0]!.longitude,
  }));
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    const c = candidates[selected];
    if (!c) return;
    setPin({ lat: c.latitude, lng: c.longitude });
  }, [selected, candidates]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle(),
      center: [pin.lng, pin.lat],
      zoom: 13,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    const marker = new maplibregl.Marker({ color: '#0f6b4f', draggable: true })
      .setLngLat([pin.lng, pin.lat])
      .addTo(map);
    marker.on('dragend', () => {
      const lngLat = marker.getLngLat();
      setPin({ lat: lngLat.lat, lng: lngLat.lng });
    });
    markerRef.current = marker;
    mapRef.current = map;
    return () => {
      marker.remove();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    marker.setLngLat([pin.lng, pin.lat]);
    map.flyTo({ center: [pin.lng, pin.lat], duration: 600 });
  }, [pin.lat, pin.lng]);

  const confirm = () => {
    const c = candidates[selected]!;
    onConfirm({
      address,
      latitude: pin.lat,
      longitude: pin.lng,
      city: c.city,
      neighborhood: c.neighborhood,
      resolvedAddress: c.resolvedAddress,
    });
  };

  return (
    <Card className="p-5" data-testid="geocode-confirm">
      <h2 className="text-h3 font-semibold text-ink">Did you mean?</h2>
      <p className="mt-1 text-sm text-ink-2">
        We found more than one match for this address. Pick the right place or drag the pin, then continue.
      </p>
      <ul className="mt-4 space-y-2">
        {candidates.map((c, i) => (
          <li key={`${c.resolvedAddress}-${i}`}>
            <button
              type="button"
              className={cn(
                'w-full rounded-lg border px-3 py-2 text-left text-sm transition',
                i === selected ? 'border-accent bg-accent/5 text-ink' : 'border-border text-ink-2 hover:border-ink-3'
              )}
              onClick={() => setSelected(i)}
            >
              <span className="font-medium text-ink">{c.neighborhood ?? c.city ?? 'Match'}</span>
              <span className="mt-0.5 block text-xs text-ink-3">{c.resolvedAddress}</span>
            </button>
          </li>
        ))}
      </ul>
      <div
        ref={containerRef}
        className="mt-4 h-[220px] w-full overflow-hidden rounded-lg border border-border"
        aria-label="Confirm map location"
      />
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" onClick={confirm}>Use this pin</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Back</Button>
      </div>
    </Card>
  );
}
