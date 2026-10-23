import type { AnalysisRequest, AnalysisResponse } from '@leaseup/contracts';

/** Minimal analysis shape for OG cards without running /api/analyze. */
export function analysisResponseStubForOg(request: AnalysisRequest): AnalysisResponse {
  const loc = request.confirmedLocation;
  const location = {
    address: request.address,
    latitude: loc?.latitude ?? 0,
    longitude: loc?.longitude ?? 0,
    neighborhood: loc?.neighborhood,
    city: loc?.city,
    resolvedAddress: loc?.resolvedAddress ?? request.address,
  };
  const now = new Date().toISOString();
  return {
    runId: 'og-preview',
    mode: 'live',
    timestamp: now,
    location,
    prospects: [],
    rankings: [],
    backtest: {
      totalStores: 0,
      predictedStores: 0,
      accuracy: 0,
      precisionAt10: 0,
      auc: 0,
      examples: [],
    },
    mapStores: [],
    dataQuality: 'insufficient',
    warnings: [],
  };
}
