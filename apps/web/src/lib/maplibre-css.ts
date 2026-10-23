let loaded = false;

/** Load MapLibre CSS only on routes that render a map (keeps landing bundle lean). */
export function ensureMapLibreCss(): void {
  if (loaded || typeof document === 'undefined') return;
  loaded = true;
  void import('maplibre-gl/dist/maplibre-gl.css');
}
