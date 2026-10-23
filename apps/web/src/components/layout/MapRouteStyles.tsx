import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ensureMapLibreCss } from '../../lib/maplibre-css';

export function MapRouteStyles() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname.startsWith('/r/') || pathname.startsWith('/brand')) {
      ensureMapLibreCss();
    }
  }, [pathname]);

  return null;
}
