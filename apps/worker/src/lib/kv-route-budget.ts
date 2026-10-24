/**
 * KV namespace (`env.CACHE`) operation budgets per HTTP surface.
 * Ephemeral caching uses Workers Cache API (`ResponseCache`), not KV.
 */

export type KvOpBudget = { gets: number; puts: number };

/** Maximum KV ops allowed per single request (integration / demo fixture paths). */
export const KV_ROUTE_BUDGET = {
  analyzeCold: { gets: 0, puts: 0 },
  analyzeWarm: { gets: 0, puts: 0 },
  geocodePreview: { gets: 0, puts: 0 },
  pitchCreate: { gets: 0, puts: 0 },
  portfolioCreate: { gets: 0, puts: 0 },
  prospectingCreate: { gets: 0, puts: 0 },
  pipelineBoardCreate: { gets: 0, puts: 0 },
  watchlistSave: { gets: 0, puts: 0 },
  watchlistRecheck: { gets: 0, puts: 0 },
  ownerUpdateShare: { gets: 0, puts: 0 },
  ownerUpdateGet: { gets: 0, puts: 0 },
  shareReportMeta: { gets: 0, puts: 0 },
  ogReportPngCold: { gets: 0, puts: 0 },
  ogReportPngWarm: { gets: 0, puts: 0 },
  ogPitchPngCold: { gets: 0, puts: 0 },
  rateLimitWindow: { gets: 0, puts: 0 },
} as const satisfies Record<string, KvOpBudget>;

/** Daily free-tier guardrail (Cloudflare KV writes). */
export const KV_DAILY_WRITE_CEILING = 200;

/**
 * Heavy demo-day traffic model (offline projection).
 * Rechecks each run a full analyze first; counts are KV puts only.
 */
export const HEAVY_DEMO_TRAFFIC = {
  analyzes: 500,
  pitchShares: 50,
  watchRechecks: 50,
  ogReportPngRenders: 50,
} as const;

export function projectedDailyKvWrites(
  traffic: typeof HEAVY_DEMO_TRAFFIC = HEAVY_DEMO_TRAFFIC
): { gets: number; puts: number } {
  const analyzeCalls = traffic.analyzes + traffic.watchRechecks;
  const puts =
    analyzeCalls * KV_ROUTE_BUDGET.analyzeCold.puts +
    traffic.pitchShares * KV_ROUTE_BUDGET.pitchCreate.puts +
    traffic.watchRechecks * KV_ROUTE_BUDGET.watchlistRecheck.puts +
    traffic.ogReportPngRenders * KV_ROUTE_BUDGET.ogReportPngCold.puts;
  const gets =
    analyzeCalls * KV_ROUTE_BUDGET.analyzeCold.gets +
    traffic.pitchShares * KV_ROUTE_BUDGET.pitchCreate.gets +
    traffic.watchRechecks * KV_ROUTE_BUDGET.watchlistRecheck.gets +
    traffic.ogReportPngRenders * KV_ROUTE_BUDGET.ogReportPngCold.gets;
  return { gets, puts };
}
