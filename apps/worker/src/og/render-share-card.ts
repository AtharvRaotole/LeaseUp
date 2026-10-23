import type { AnalysisResponse } from '@leaseup/contracts';
import type { PitchPackSnapshot } from '@leaseup/contracts';
import { displayBrandName } from '../lib/brand-display';

const W = 1200;
const H = 630;
const FONT = 'Schibsted Grotesk';

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function brandLinesFromReport(results: AnalysisResponse, max = 5): string[] {
  return results.prospects.slice(0, max).map((p, i) => {
    const name = displayBrandName(p.brand.entityId, p.brand.name);
    const rank = p.brand.affinityRank ?? i + 1;
    return `#${rank} ${name}`;
  });
}

function brandLinesFromPitch(snapshot: PitchPackSnapshot): string[] {
  return snapshot.prospects.map((row, i) => {
    const name = displayBrandName(row.prospect.brand.entityId, row.prospect.brand.name);
    const rank = row.prospect.brand.affinityRank ?? i + 1;
    return `#${rank} ${name}`;
  });
}

/** Share card layout as SVG (rasterized with embedded Schibsted Grotesk in the worker). */
export function renderReportShareSvg(results: AnalysisResponse, radiusKm: number): string {
  const area =
    results.location.neighborhood?.trim() ||
    results.location.city?.trim() ||
    results.location.address;
  const headline = `${results.prospects.length} brands to pitch near ${area}`;
  const sub = `${radiusKm} km radius · Qloo taste + ATP store check`;
  const lines = brandLinesFromReport(results);

  return wrapCard(headline, sub, lines);
}

export function renderPitchShareSvg(snapshot: PitchPackSnapshot): string {
  const area =
    snapshot.neighborhood?.trim() || snapshot.location.city?.trim() || snapshot.address;
  const headline = `Pitch pack · ${area}`;
  const sub = `${snapshot.radiusKm} km · ${snapshot.prospects.length} prospects`;
  const lines = brandLinesFromPitch(snapshot);

  return wrapCard(headline, sub, lines);
}

function wrapCard(headline: string, sub: string, lines: string[]): string {
  const list = lines
    .map(
      (line, i) =>
        `<text x="72" y="${300 + i * 52}" font-family="${FONT}" font-size="32" font-weight="500" fill="#0B0B0C">${escapeXml(line)}</text>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="#FAFAF7"/>
  <rect x="0" y="0" width="${W}" height="8" fill="#0F6B4F"/>
  <text x="72" y="120" font-family="${FONT}" font-size="52" font-weight="600" fill="#0B0B0C">${escapeXml(headline)}</text>
  <text x="72" y="180" font-family="${FONT}" font-size="28" font-weight="400" fill="#5C5C5C">${escapeXml(sub)}</text>
  ${list}
  <text x="72" y="${H - 48}" font-family="${FONT}" font-size="24" font-weight="600" fill="#0F6B4F">LeaseUp</text>
</svg>`;
}

export const OG_WIDTH = W;
export const OG_HEIGHT = H;
