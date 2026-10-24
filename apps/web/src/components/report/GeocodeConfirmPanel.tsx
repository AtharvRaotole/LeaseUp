import { useCallback, useEffect, useId, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { GeocodeCandidate, Location } from '@leaseup/contracts';
import { mapMarkerColor } from '../../lib/map-accent';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { cn } from '../../lib/cn';
import { MapPin } from 'lucide-react';
import {
  distanceFromFirstLabel,
  geocodeCandidateStreetLine,
  geocodeCandidateSubtitle,
  geocodeCandidateTitle,
} from '../../lib/geocode-display';

import { mapBasemapStyleUrl } from '../../lib/theme';

export function GeocodeConfirmPanel({
  address,
  candidates,
  onConfirm,
  onCancel,
  onNoneOfThese,
}: {
  address: string;
  candidates: GeocodeCandidate[];
  onConfirm: (location: Location) => void;
  onCancel: () => void;
  onNoneOfThese?: () => void;
}) {
  const listId = useId();
  const [selected, setSelected] = useState(0);
  const [pin, setPin] = useState<{ lat: number; lng: number }>(() => ({
    lat: candidates[0]!.latitude,
    lng: candidates[0]!.longitude,
  }));
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const resizeMap = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    map.resize();
  }, []);

  useEffect(() => {
    const c = candidates[selected];
    if (!c) return;
    setPin({ lat: c.latitude, lng: c.longitude });
  }, [selected, candidates]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapBasemapStyleUrl(),
      center: [pin.lng, pin.lat],
      zoom: 13,
      touchZoomRotate: true,
      touchPitch: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    const marker = new maplibregl.Marker({ color: mapMarkerColor(), draggable: true })
      .setLngLat([pin.lng, pin.lat])
      .addTo(map);
    marker.on('dragend', () => {
      const lngLat = marker.getLngLat();
      setPin({ lat: lngLat.lat, lng: lngLat.lng });
    });
    markerRef.current = marker;
    mapRef.current = map;
    const scheduleResize = () => {
      requestAnimationFrame(() => {
        map.resize();
        requestAnimationFrame(() => map.resize());
      });
    };
    map.on('load', scheduleResize);
    scheduleResize();
    return () => {
      marker.remove();
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => resizeMap());
    ro.observe(el);
    return () => ro.disconnect();
  }, [resizeMap]);

  useEffect(() => {
    window.addEventListener('resize', resizeMap);
    return () => window.removeEventListener('resize', resizeMap);
  }, [resizeMap]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    marker.setLngLat([pin.lng, pin.lat]);
    map.flyTo({ center: [pin.lng, pin.lat], duration: 600 });
    resizeMap();
  }, [pin.lat, pin.lng, resizeMap]);

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

  const onListKeyDown = useCallback(
    (ev: React.KeyboardEvent) => {
      if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        setSelected((i) => Math.min(candidates.length - 1, i + 1));
      } else if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        setSelected((i) => Math.max(0, i - 1));
      } else if (ev.key === 'Home') {
        ev.preventDefault();
        setSelected(0);
      } else if (ev.key === 'End') {
        ev.preventDefault();
        setSelected(candidates.length - 1);
      }
    },
    [candidates.length]
  );

  useEffect(() => {
    optionRefs.current[selected]?.focus();
  }, [selected]);

  const first = candidates[0]!;

  return (
    <Card className="min-w-0 p-5" data-testid="geocode-confirm">
      <h2 className="text-h3 font-semibold text-ink">Which storefront did you mean?</h2>
      <p className="mt-1 text-sm text-ink-2">
        We found a few close matches for &quot;{address}&quot;. Pick the one you are leasing, then
        fine tune the pin on the map.
      </p>
      <div
        role="listbox"
        aria-label="Address matches"
        aria-activedescendant={`${listId}-opt-${selected}`}
        tabIndex={0}
        className="mt-4 space-y-2 outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-control"
        onKeyDown={onListKeyDown}
        data-testid="geocode-candidate-list"
      >
        {candidates.map((c, i) => {
          const distance = i > 0 ? distanceFromFirstLabel(first, c) : null;
          const distanceLine = i === 0 ? 'Top match for your search' : distance ?? 'Same block as the first match';
          return (
            <button
              key={`${c.resolvedAddress}-${i}`}
              id={`${listId}-opt-${i}`}
              ref={(el) => {
                optionRefs.current[i] = el;
              }}
              type="button"
              role="option"
              aria-selected={i === selected}
              className={cn(
                'flex w-full gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                i === selected ? 'border-accent bg-accent/5 text-ink' : 'border-border text-ink-2 hover:border-ink-3'
              )}
              onClick={() => setSelected(i)}
            >
              <span
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-ink-3"
                aria-hidden
              >
                <MapPin className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{geocodeCandidateTitle(c)}</p>
                <p className="mt-0.5 text-sm text-ink-2">{geocodeCandidateSubtitle(c)}</p>
                <p className="mt-1 text-xs text-ink-3">{geocodeCandidateStreetLine(c)}</p>
                <p className="mt-1 text-xs text-ink-3">{distanceLine}</p>
              </div>
            </button>
          );
        })}
      </div>
      <div
        ref={containerRef}
        className="relative mt-4 h-[min(52vh,360px)] min-h-[280px] w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-border sm:min-h-[220px] sm:h-[220px]"
        aria-label="Confirm map location"
        data-testid="geocode-confirm-map"
      />
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" onClick={confirm} data-testid="geocode-confirm-use">
          Use this pin
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Back</Button>
        <Button
          type="button"
          variant="ghost"
          data-testid="geocode-none-of-these"
          onClick={() => (onNoneOfThese ? onNoneOfThese() : onCancel())}
        >
          None of these
        </Button>
      </div>
    </Card>
  );
}
