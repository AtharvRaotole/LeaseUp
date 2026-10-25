import type { ProspectPack, TradeAreaTasteContext, WhyBrandTaste } from '@leaseup/contracts';
import {
  deterministicWhyBrandTasteSummary,
  BRAND_AUDIENCE_MAX_SHOWN,
  sanitizeWhyBrandTasteSummary,
  topBrandTasteOverlapSignals,
} from '@leaseup/fixtures/worker';
import { WHY_BRAND_BATCH_MAX, type OpenAIClient } from '../providers/openai';

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

/**
 * Batched variant: one gpt-4o-mini call for the first WHY_BRAND_BATCH_MAX prospects with
 * overlap signals; the rest (and any the model skips) keep the deterministic sentence.
 * Keeps a live run inside the Workers Free subrequest cap.
 */
export async function enrichProspectsWhyBrandTaste(
  packs: ProspectPack[],
  openai: OpenAIClient,
  mode: 'live' | 'demo'
): Promise<ProspectPack[]> {
  const bases = packs.map((pack) =>
    buildWhyBrandTasteFromContext(pack.brand.name, pack.tradeAreaTaste)
  );
  if (mode === 'demo') {
    return packs.map((pack, i) => (bases[i] ? { ...pack, whyBrandTaste: bases[i] } : pack));
  }
  const modelIdx = bases
    .map((b, i) => (b ? i : -1))
    .filter((i) => i >= 0)
    .slice(0, WHY_BRAND_BATCH_MAX);
  const summaries = modelIdx.length
    ? await openai.summarizeWhyBrandTasteBatch(
        modelIdx.map((i) => ({
          brandName: packs[i]!.brand.name,
          signals: bases[i]!.signals,
        }))
      )
    : [];
  const byIdx = new Map(modelIdx.map((i, k) => [i, summaries[k]]));
  return packs.map((pack, i) => {
    const base = bases[i];
    if (!base) return pack;
    const why = buildWhyBrandTasteFromContext(
      pack.brand.name,
      pack.tradeAreaTaste,
      byIdx.get(i) || base.summary
    );
    return why ? { ...pack, whyBrandTaste: why } : pack;
  });
}
