import type { BrandTasteOverlapSignal } from './qloo-brand-taste-overlap.js';
import { deterministicWhyBrandTasteSummary } from './qloo-brand-taste-overlap.js';

/** Generic LLM filler we strip from broker-facing taste copy. */
export const WHY_BRAND_TASTE_BANNED_PHRASES: readonly string[] = [
  'resonates well',
  'resonates with',
  'trendy lifestyles',
  'trendy lifestyle',
  'aligns well',
  'strong fit',
  'great fit',
  'perfect fit',
  'ideal fit',
  'well suited',
  'well-suited',
  'local shoppers love',
  'shoppers love',
];

const UNIT_AFFINITY_DECIMAL = /\b(?:0?\.\d{1,3})\b/g;

function isUnitAffinityToken(token: string): boolean {
  const n = Number(token);
  return Number.isFinite(n) && n >= 0 && n <= 1;
}

/** Remove raw Qloo affinity decimals and banned filler from model or stale stored summaries. */
export function sanitizeWhyBrandTasteSummary(text: string): string {
  let out = text.trim();
  if (!out) return '';

  out = out.replace(UNIT_AFFINITY_DECIMAL, (match) => (isUnitAffinityToken(match) ? '' : match));
  out = out.replace(/\b(?:brand\s+)?affinity\s*#?\d*\b/gi, '');
  out = out.replace(/\bAudience:\s*[^.;]+/gi, '');
  out = out.replace(/\bTag:\s*[^.;]+/gi, '');

  for (const phrase of WHY_BRAND_TASTE_BANNED_PHRASES) {
    const re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    out = out.replace(re, '');
  }

  out = out.replace(/\s{2,}/g, ' ');
  out = out.replace(/\s+([,.;])/g, '$1');
  out = out.replace(/([.;])\s*([.;])+/g, '$1');
  out = out.trim();

  if (out.length > 0 && !/[.!?]$/.test(out)) {
    out = `${out}.`;
  }
  return out;
}

function summaryMentionsSignals(
  summary: string,
  signals: BrandTasteOverlapSignal[]
): boolean {
  const lower = summary.toLowerCase();
  return signals.some((s) => lower.includes(s.name.toLowerCase()));
}

function summaryUsedBannedOrAffinityDecimals(raw: string): boolean {
  const lower = raw.toLowerCase();
  if (WHY_BRAND_TASTE_BANNED_PHRASES.some((p) => lower.includes(p))) return true;
  const matches = raw.match(UNIT_AFFINITY_DECIMAL);
  if (!matches) return false;
  return matches.some((token) => isUnitAffinityToken(token));
}

export function pitchBrandTasteFitSentence(
  brandName: string,
  taste?: { summary?: string; signals?: BrandTasteOverlapSignal[] }
): string | undefined {
  const signals = taste?.signals ?? [];
  const rawSummary = taste?.summary?.trim() ?? '';
  const fromSummary = rawSummary ? sanitizeWhyBrandTasteSummary(rawSummary) : '';
  const summaryOk =
    fromSummary.length >= 20 &&
    !summaryUsedBannedOrAffinityDecimals(rawSummary) &&
    summaryMentionsSignals(fromSummary, signals);
  if (summaryOk) {
    return fromSummary;
  }
  const deterministic = deterministicWhyBrandTasteSummary(brandName, signals);
  const cleaned = sanitizeWhyBrandTasteSummary(deterministic);
  return cleaned || undefined;
}
