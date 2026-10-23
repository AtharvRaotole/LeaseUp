import { z } from 'zod';

export const LocationSchema = z.object({
  address: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  city: z.string().optional(),
  neighborhood: z.string().optional(),
  resolvedAddress: z.string().optional(),
});

export type Location = z.infer<typeof LocationSchema>;

export const BrandAffinitySchema = z.object({
  entityId: z.string(),
  name: z.string(),
  affinity: z.number(),
  affinityRank: z.number(),
  popularity: z.number().optional(),
  nationalStoreCount: z.number().optional(),
  nearbyStoreCount: z.number().optional(),
  verified: z.union([
    z.literal('verified (2 sources)'),
    z.literal('unverified (1 source)'),
    z.literal('conflict'),
    z.literal('unverified')
  ]),
  verificationSources: z.array(z.string()).optional(),
  explanation: z.string().optional(),
});

export type BrandAffinity = z.infer<typeof BrandAffinitySchema>;

export const BacktestResultSchema = z.object({
  totalStores: z.number(),
  predictedStores: z.number(),
  accuracy: z.number(),
  precisionAt10: z.number(),
  presentInTop10: z.number().optional(),
  auc: z.number().optional(),
  examples: z.array(z.object({
    name: z.string(),
    distance: z.number(),
    rank: z.number(),
    predicted: z.boolean(),
  })),
});

export type BacktestResult = z.infer<typeof BacktestResultSchema>;

export const TenantMixScoreSchema = z.object({
  score: z.number(),
  coAffinityMean: z.number(),
  categoryFit: z.string(),
  explanation: z.string(),
});

export type TenantMixScore = z.infer<typeof TenantMixScoreSchema>;

export const ProspectPackSchema = z.object({
  brand: BrandAffinitySchema,
  tenantMixScore: TenantMixScoreSchema.optional(),
  demographics: z.object({
    ageSkew: z.record(z.string(), z.number()).optional(),
    genderSkew: z.record(z.string(), z.number()).optional(),
  }).optional(),
  outreachDraft: z.string(),
  reasons: z.array(z.string()),
  nearestExistingStoreKm: z.number().optional(),
  qlooSignals: z.array(z.string()).optional(),
});

export type ProspectPack = z.infer<typeof ProspectPackSchema>;

export const AnalysisRequestSchema = z.object({
  address: z.string().min(3).max(500),
  radius: z.number().min(0.5).max(50).default(10),
  categoryTags: z.array(z.string()).optional(),
});

export type AnalysisRequest = z.infer<typeof AnalysisRequestSchema>;

export const AnalysisStepIdSchema = z.enum([
  'locate',
  'taste',
  'backtest',
  'prospects',
  'verify',
  'outreach_ready',
]);

export type AnalysisStepId = z.infer<typeof AnalysisStepIdSchema>;

export const AnalysisStepSchema = z.object({
  id: AnalysisStepIdSchema,
  label: z.string(),
  status: z.enum(['pending', 'running', 'complete', 'error']),
  durationMs: z.number().optional(),
  summary: z.string().optional(),
  detail: z.record(z.unknown()).optional(),
});

export type AnalysisStep = z.infer<typeof AnalysisStepSchema>;

export const BrandRankingRowSchema = z.object({
  entityId: z.string(),
  name: z.string(),
  affinity: z.number(),
  qlooRank: z.number(),
  blendedRank: z.number(),
  presentInRadius: z.boolean(),
  nearestStoreKm: z.number().optional(),
});

export type BrandRankingRow = z.infer<typeof BrandRankingRowSchema>;

export const HeatmapCellSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  affinity: z.number().optional(),
  affinityRank: z.number(),
});

export type HeatmapCell = z.infer<typeof HeatmapCellSchema>;

export const MapStorePointSchema = z.object({
  entityId: z.string(),
  brandName: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  distanceKm: z.number(),
});

export type MapStorePoint = z.infer<typeof MapStorePointSchema>;

export const OutreachRequestSchema = z.object({
  brandName: z.string().min(1),
  address: z.string().min(3),
  reasons: z.array(z.string()).default([]),
  runId: z.string().optional(),
  affinityRank: z.number().optional(),
  neighborhood: z.string().optional(),
  nearestStoreKm: z.number().optional(),
});

export type OutreachRequest = z.infer<typeof OutreachRequestSchema>;

export const AnalysisResponseSchema = z.object({
  location: LocationSchema,
  backtest: BacktestResultSchema,
  backtestBlended: BacktestResultSchema.optional(),
  rankings: z.array(BrandRankingRowSchema).optional(),
  mapStores: z.array(MapStorePointSchema).optional(),
  heatmapAvailable: z.boolean().optional(),
  prospects: z.array(ProspectPackSchema),
  dataQuality: z.enum(['high', 'medium', 'low', 'insufficient']),
  warnings: z.array(z.string()),
  runId: z.string(),
  timestamp: z.string(),
  mode: z.enum(['live', 'demo']).optional(),
  chainPriorWeight: z.number().optional(),
});

export type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>;

export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string(),
  details: z.any().optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
