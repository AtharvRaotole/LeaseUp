import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ensureMapLibreCss } from '../../lib/maplibre-css';

export function MapRouteStyles() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname.startsWith('/brand')) {
      ensureMapLibreCss();
    }
    if (pathname.startsWith('/r/') && typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches) {
      ensureMapLibreCss();
    }
  }, [pathname]);

  return null;
}
