/** Map marker colors aligned with design tokens. */
export function mapMarkerColor(active = false): string {
  if (typeof document === 'undefined') {
    return active ? '#c5f0f7' : '#8fe3f0';
  }
  const key = active ? '--map-marker-active' : '--map-marker';
  const value = getComputedStyle(document.documentElement).getPropertyValue(key).trim();
  return value || (active ? '#c5f0f7' : '#8fe3f0');
}
