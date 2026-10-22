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
  verified: z.union([z.literal('verified'), z.literal('unverified (1 source)'), z.literal('unverified')]),
  verificationSources: z.array(z.string()).optional(),
  explanation: z.string().optional(),
});

export type BrandAffinity = z.infer<typeof BrandAffinitySchema>;

export const BacktestResultSchema = z.object({
  totalStores: z.number(),
  predictedStores: z.number(),
  accuracy: z.number(),
  precisionAt10: z.number(),
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
});

export type ProspectPack = z.infer<typeof ProspectPackSchema>;

export const AnalysisRequestSchema = z.object({
  address: z.string().min(3).max(500),
  radius: z.number().min(0.5).max(50).default(10),
  categoryTags: z.array(z.string()).optional(),
});

export type AnalysisRequest = z.infer<typeof AnalysisRequestSchema>;

export const AnalysisResponseSchema = z.object({
  location: LocationSchema,
  backtest: BacktestResultSchema,
  prospects: z.array(ProspectPackSchema),
  dataQuality: z.enum(['high', 'medium', 'low', 'insufficient']),
  warnings: z.array(z.string()),
  runId: z.string(),
  timestamp: z.string(),
});

export type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>;

export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string(),
  details: z.any().optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
