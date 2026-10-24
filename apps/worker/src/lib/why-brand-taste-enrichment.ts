import type { ProspectPack, TradeAreaTasteContext, WhyBrandTaste } from '@leaseup/contracts';
import {
  deterministicWhyBrandTasteSummary,
  distinctPitchAudienceLists,
  sanitizeWhyBrandTasteSummary,
  topBrandTasteOverlapSignals,
} from '@leaseup/fixtures/worker';
import type { OpenAIClient } from '../providers/openai';

export function buildWhyBrandTasteFromContext(
  brandName: string,
  tradeAreaTaste: TradeAreaTasteContext | undefined,
  summary?: string
): WhyBrandTaste | undefined {
  const signals = topBrandTasteOverlapSignals(tradeAreaTaste, 3);
  if (signals.length === 0) return undefined;
  const raw = summary?.trim() || deterministicWhyBrandTasteSummary(brandName, signals);
  const text = raw ? sanitizeWhyBrandTasteSummary(raw) : '';
  return {
    signals,
    summary: text || undefined,
  };
}

/** Pick distinct primary audiences across pitched brands, then rebuild whyBrandTaste from trimmed rows. */
export function applyDistinctPitchAudiencesToProspects(prospects: ProspectPack[]): ProspectPack[] {
  const pools = prospects.map((pack) => pack.tradeAreaTaste?.audiences ?? []);
  const trimmed = distinctPitchAudienceLists(pools);
  return prospects.map((pack, index) => {
    const audiences = trimmed[index] ?? [];
    if (audiences.length === 0) return pack;
    const tradeAreaTaste: TradeAreaTasteContext = {
      tags: pack.tradeAreaTaste?.tags ?? [],
      audiences,
    };
    const whyBrandTaste = buildWhyBrandTasteFromContext(
      pack.brand.name,
      tradeAreaTaste,
      pack.whyBrandTaste?.summary
    );
    return { ...pack, tradeAreaTaste, whyBrandTaste };
  });
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
