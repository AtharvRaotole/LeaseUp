import type { ProspectPack, TradeAreaTasteContext, WhyBrandTaste } from '@leaseup/contracts';
import {
  deterministicWhyBrandTasteSummary,
  BRAND_AUDIENCE_MAX_SHOWN,
  sanitizeWhyBrandTasteSummary,
  topBrandTasteOverlapSignals,
} from '@leaseup/fixtures/worker';
import type { OpenAIClient } from '../providers/openai';

export function buildWhyBrandTasteFromContext(
  brandName: string,
  tradeAreaTaste: TradeAreaTasteContext | undefined,
  summary?: string
): WhyBrandTaste | undefined {
  const signals = topBrandTasteOverlapSignals(tradeAreaTaste, BRAND_AUDIENCE_MAX_SHOWN);
  if (signals.length === 0) return undefined;
  const raw = summary?.trim() || deterministicWhyBrandTasteSummary(brandName, signals);
  const text = raw ? sanitizeWhyBrandTasteSummary(raw) : '';
  return {
    signals,
    summary: text || undefined,
  };
}

export async function enrichProspectWhyBrandTaste(
  pack: ProspectPack,
  openai: OpenAIClient,
  mode: 'live' | 'demo'
): Promise<ProspectPack> {
  const base = buildWhyBrandTasteFromContext(pack.brand.name, pack.tradeAreaTaste);
  if (!base) return pack;

  if (mode === 'demo') {
    return { ...pack, whyBrandTaste: base };
  }

  const summary = await openai.summarizeWhyBrandTaste({
    brandName: pack.brand.name,
    signals: base.signals,
    runId: undefined,
  });

  const whyBrandTaste = buildWhyBrandTasteFromContext(
    pack.brand.name,
    pack.tradeAreaTaste,
    summary || base.summary
  );

  return whyBrandTaste ? { ...pack, whyBrandTaste } : pack;
}
