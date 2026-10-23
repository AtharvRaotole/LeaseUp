import type { ExpressionSpecification } from 'maplibre-gl';

/** MapLibre heatmap-density paint ramp (matches report map legend). */
export const HEATMAP_COLOR_EXPRESSION: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['heatmap-density'],
  0,
  'rgba(255,244,214,0)',
  0.4,
  '#fdba74',
  1,
  '#c2410c',
];
