import type { AnalysisResponse, PitchPackSnapshot } from '@leaseup/contracts';
import { renderPitchShareSvg, renderReportShareSvg } from './render-share-card';
import { svgToPng } from './svg-to-png';

/** Brand share cards: SVG layout (Satori-style) rasterized with Resvg in the worker. */
export async function renderReportSharePng(
  results: AnalysisResponse,
  radiusKm: number
): Promise<Uint8Array> {
  const svg = renderReportShareSvg(results, radiusKm);
  return svgToPng(svg);
}

export async function renderPitchSharePng(snapshot: PitchPackSnapshot): Promise<Uint8Array> {
  const svg = renderPitchShareSvg(snapshot);
  return svgToPng(svg);
}
