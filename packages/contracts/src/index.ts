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

export const StorefrontFormatSchema = z.enum(['streetfront', 'mall_inline', 'big_box']);

export type StorefrontFormat = z.infer<typeof StorefrontFormatSchema>;

export const ChainSizeTierSchema = z.enum(['small', 'mid', 'big']);

export type ChainSizeTier = z.infer<typeof ChainSizeTierSchema>;

export const BrandAffinitySchema = z.object({
  entityId: z.string(),
  name: z.string(),
  affinity: z.number(),
  affinityRank: z.number(),
  popularity: z.number().optional(),
  nationalStoreCount: z.number().optional(),
  chainSizeTier: ChainSizeTierSchema.optional(),
  tasteFitBeyondChainPercentile: z.number().min(1).max(99).optional(),
  sizeDriven: z.boolean().optional(),
  nearbyStoreCount: z.number().optional(),
  storefrontFormat: StorefrontFormatSchema.optional(),
  minStorefrontSqFt: z.number().int().optional(),
  verified: z.union([
    z.literal('verified (2 sources)'),
    z.literal('unverified (1 source)'),
    z.literal('conflict'),
    z.literal('unverified'),
    z.literal('verifying...'),
    z.literal('conflict - likely present'),
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

export const TradeAreaTasteRowSchema = z.object({
  entityId: z.string(),
  name: z.string(),
  affinity: z.number(),
  affinityRank: z.number(),
});

export type TradeAreaTasteRow = z.infer<typeof TradeAreaTasteRowSchema>;

export const TradeAreaTasteContextSchema = z.object({
  tags: z.array(TradeAreaTasteRowSchema),
  audiences: z.array(TradeAreaTasteRowSchema),
});

export type TradeAreaTasteContext = z.infer<typeof TradeAreaTasteContextSchema>;

export const ProspectPackSchema = z.object({
  coverageNote: z.string().optional(),
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
  tradeAreaTaste: TradeAreaTasteContextSchema.optional(),
});

export type ProspectPack = z.infer<typeof ProspectPackSchema>;

export const AnalysisRequestSchema = z.object({
  address: z.string().min(3).max(500),
  radius: z.number().min(0.5).max(50).default(10),
  categoryTags: z.array(z.string()).optional(),
  /** User storefront size (sq ft) for format-fit filtering. */
  storefrontSqFt: z.number().min(200).max(500_000).optional(),
  /** When set, skip re-geocoding and use these coordinates for Qloo signal.location. */
  confirmedLocation: LocationSchema.optional(),
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
  baselineRank: z.number().optional(),
  nationalStoreCount: z.number().optional(),
  chainSizeTier: ChainSizeTierSchema.optional(),
  tasteFitBeyondChainPercentile: z.number().min(1).max(99).optional(),
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
  coTenantBrands: z.array(z.string()).max(8).optional(),
  verificationLabel: z.string().optional(),
});

export type OutreachRequest = z.infer<typeof OutreachRequestSchema>;

export const EvalMetricPanelSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  qloo: z.number().optional(),
  chain: z.number().optional(),
  randomExpected: z.number().optional(),
  randomMonteCarlo: z.number().optional(),
  winner: z.enum(['qloo', 'chain', 'tie', 'none']).optional(),
  detail: z.string().optional(),
});

export type EvalMetricPanel = z.infer<typeof EvalMetricPanelSchema>;

export const StrictEvalSnapshotSchema = z.object({
  manifestId: z.string(),
  headlineMetricId: z.string().nullable(),
  dataSource: z.string(),
  searchRadiusKm: z.number(),
  adaptiveRadiusKm: z.number(),
  density: z.enum(['urban', 'suburban', 'exurban', 'tourist']),
  poolSize: z.number(),
  panels: z.array(EvalMetricPanelSchema),
  notes: z.array(z.string()),
});

export type StrictEvalSnapshot = z.infer<typeof StrictEvalSnapshotSchema>;

export const AnalysisResponseSchema = z.object({
  location: LocationSchema,
  backtest: BacktestResultSchema,
  backtestBlended: BacktestResultSchema.optional(),
  /** Same brands ranked by national ATP store count only (no taste). */
  backtestBaseline: BacktestResultSchema.optional(),
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
  osmSnapshotRecordedAt: z.string().optional(),
  osmSnapshotLabel: z.string().optional(),
  storefrontSqFt: z.number().optional(),
  formatFilteredCount: z.number().int().optional(),
  strictEval: StrictEvalSnapshotSchema.optional(),
});

export type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>;

export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string(),
  details: z.any().optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

export const TrackedBrandSchema = z.object({
  entityId: z.string(),
  name: z.string(),
  displayName: z.string(),
});

export type TrackedBrand = z.infer<typeof TrackedBrandSchema>;

export const MetroOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export type MetroOption = z.infer<typeof MetroOptionSchema>;

export const BrandReverseSourceSchema = z.enum(['heatmap', 'grid_insights']);

export type BrandReverseSource = z.infer<typeof BrandReverseSourceSchema>;

export const BrandReverseOpportunitySchema = z.object({
  rank: z.number().int(),
  latitude: z.number(),
  longitude: z.number(),
  affinity: z.number().optional(),
  affinityRank: z.number(),
  affinityPercentile: z.number().optional(),
  metroAreaRank: z.number().int().optional(),
  metroAreaCount: z.number().int().optional(),
  neighborhood: z.string().optional(),
  nearestStoreKm: z.number().optional(),
  reportPath: z.string(),
});

export type BrandReverseOpportunity = z.infer<typeof BrandReverseOpportunitySchema>;

export const BrandReverseResponseSchema = z.object({
  brand: TrackedBrandSchema,
  metro: MetroOptionSchema,
  source: BrandReverseSourceSchema,
  sourceNote: z.string().optional(),
  recordedAt: z.string().optional(),
  cells: z.array(HeatmapCellSchema),
  stores: z.array(
    z.object({
      latitude: z.number(),
      longitude: z.number(),
    })
  ),
  opportunities: z.array(BrandReverseOpportunitySchema),
  mode: z.enum(['live', 'demo']),
});

export type BrandReverseResponse = z.infer<typeof BrandReverseResponseSchema>;

export const GeocodeCandidateSchema = z.object({
  address: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  resolvedAddress: z.string(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
});

export type GeocodeCandidate = z.infer<typeof GeocodeCandidateSchema>;

export const GeocodePreviewRequestSchema = z.object({
  address: z.string().min(3).max(500),
});

export type GeocodePreviewRequest = z.infer<typeof GeocodePreviewRequestSchema>;

export const GeocodePreviewResponseSchema = z.object({
  needsConfirmation: z.boolean(),
  candidates: z.array(GeocodeCandidateSchema).max(3),
  location: LocationSchema.optional(),
});

export type GeocodePreviewResponse = z.infer<typeof GeocodePreviewResponseSchema>;

export const PortfolioRowStatusSchema = z.enum([
  'pending',
  'geocoding',
  'ambiguous',
  'ready',
  'analyzing',
  'complete',
  'error',
]);

export type PortfolioRowStatus = z.infer<typeof PortfolioRowStatusSchema>;

export const PortfolioProspectSummarySchema = z.object({
  name: z.string(),
  entityId: z.string(),
  affinityRank: z.number(),
});

export type PortfolioProspectSummary = z.infer<typeof PortfolioProspectSummarySchema>;

export const PortfolioRowSchema = z.object({
  id: z.string(),
  inputAddress: z.string(),
  status: PortfolioRowStatusSchema,
  geocodeCandidates: z.array(GeocodeCandidateSchema).optional(),
  location: LocationSchema.optional(),
  error: z.string().optional(),
  topProspects: z.array(PortfolioProspectSummarySchema).optional(),
  backtestHitRate: z.number().optional(),
  neighborhood: z.string().optional(),
  runId: z.string().optional(),
  analyzingStartedAt: z.string().optional(),
});

export type PortfolioRow = z.infer<typeof PortfolioRowSchema>;

export const PortfolioCreateSchema = z.object({
  addresses: z.array(z.string().min(3).max(500)).min(1).max(10),
});

export type PortfolioCreate = z.infer<typeof PortfolioCreateSchema>;

export const PortfolioConfirmGeocodeSchema = z.object({
  rowId: z.string(),
  candidateIndex: z.number().int().min(0),
});

export type PortfolioConfirmGeocode = z.infer<typeof PortfolioConfirmGeocodeSchema>;

export const PortfolioResponseSchema = z.object({
  id: z.string(),
  rows: z.array(PortfolioRowSchema),
  createdAt: z.string(),
  mode: z.enum(['live', 'demo']),
});

export type PortfolioResponse = z.infer<typeof PortfolioResponseSchema>;

export const VacancyCalculatorInputSchema = z.object({
  squareFeet: z.number().min(0).max(1_000_000),
  rentPerSqFtYear: z.number().min(0).max(10_000),
  monthsVacant: z.number().min(0).max(120),
});

export type VacancyCalculatorInput = z.infer<typeof VacancyCalculatorInputSchema>;

export const PitchLandlordSchema = z.object({
  name: z.string().max(200).optional(),
  contact: z.string().max(500).optional(),
});

export type PitchLandlord = z.infer<typeof PitchLandlordSchema>;

export const PitchProspectSnapshotSchema = z.object({
  prospect: ProspectPackSchema,
  whyLine: z.string().max(500),
});

export type PitchProspectSnapshot = z.infer<typeof PitchProspectSnapshotSchema>;

export const PitchPackSnapshotSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string(),
  address: z.string(),
  neighborhood: z.string().optional(),
  location: LocationSchema,
  radiusKm: z.number(),
  analysisTimestamp: z.string(),
  runId: z.string(),
  mode: z.enum(['live', 'demo']).optional(),
  osmSnapshotLabel: z.string().optional(),
  osmSnapshotRecordedAt: z.string().optional(),
  mapImage: z.string().max(900_000).optional(),
  prospects: z.array(PitchProspectSnapshotSchema).max(5),
  rankingsTotal: z.number().int().optional(),
  landlord: PitchLandlordSchema.optional(),
  vacancy: VacancyCalculatorInputSchema.optional(),
});

export type PitchPackSnapshot = z.infer<typeof PitchPackSnapshotSchema>;

export const PitchCreateSchema = z.object({
  results: AnalysisResponseSchema,
  radiusKm: z.number().min(0.5).max(50),
  mapImage: z.string().max(900_000).optional(),
  landlord: PitchLandlordSchema.optional(),
  vacancy: VacancyCalculatorInputSchema.optional(),
});

export type PitchCreate = z.infer<typeof PitchCreateSchema>;

export const ProspectingStepIdSchema = z.enum([
  'geocode',
  'taste',
  'scan_stores',
  'verify_osm',
  'rank_backtest',
  'explain_top5',
  'draft_outreach',
  'pitch_pack',
]);

export type ProspectingStepId = z.infer<typeof ProspectingStepIdSchema>;

export const ProspectingStepSchema = z.object({
  id: ProspectingStepIdSchema,
  label: z.string(),
  status: z.enum(['pending', 'running', 'complete', 'error']),
  durationMs: z.number().optional(),
  summary: z.string().optional(),
  detail: z.record(z.unknown()).optional(),
});

export type ProspectingStep = z.infer<typeof ProspectingStepSchema>;

export const ProspectingOutreachDraftSchema = z.object({
  entityId: z.string(),
  brandName: z.string(),
  subject: z.string(),
  body: z.string(),
  model: z.string().optional(),
});

export type ProspectingOutreachDraft = z.infer<typeof ProspectingOutreachDraftSchema>;

export const ProspectingJobStatusSchema = z.enum([
  'pending',
  'needs_geocode',
  'ready',
  'running',
  'complete',
  'error',
]);

export type ProspectingJobStatus = z.infer<typeof ProspectingJobStatusSchema>;

export const ProspectingCreateSchema = AnalysisRequestSchema;

export type ProspectingCreate = z.infer<typeof ProspectingCreateSchema>;

export const ProspectingConfirmGeocodeSchema = z.object({
  candidateIndex: z.number().int().min(0),
});

export type ProspectingConfirmGeocode = z.infer<typeof ProspectingConfirmGeocodeSchema>;

export const ProspectingJobSchema = z.object({
  id: z.string().uuid(),
  status: ProspectingJobStatusSchema,
  input: AnalysisRequestSchema,
  geocodeCandidates: z.array(GeocodeCandidateSchema).optional(),
  confirmedLocation: LocationSchema.optional(),
  steps: z.array(ProspectingStepSchema),
  outreachDrafts: z.array(ProspectingOutreachDraftSchema).optional(),
  pitchId: z.string().optional(),
  analysisRunId: z.string().optional(),
  createdAt: z.string(),
  mode: z.enum(['live', 'demo']),
  error: z.string().optional(),
  runningStartedAt: z.string().optional(),
});

export type ProspectingJob = z.infer<typeof ProspectingJobSchema>;

export const PipelineColumnSchema = z.enum([
  'to_pitch',
  'contacted',
  'touring',
  'loi',
  'signed',
  'passed',
]);

export type PipelineColumn = z.infer<typeof PipelineColumnSchema>;

export const PipelineOutreachDraftSchema = z.object({
  subject: z.string(),
  body: z.string(),
  model: z.string().optional(),
});

export type PipelineOutreachDraft = z.infer<typeof PipelineOutreachDraftSchema>;

export const PipelineOutreachStatusSchema = z.enum(['none', 'drafted', 'sent', 'replied']);

export type PipelineOutreachStatus = z.infer<typeof PipelineOutreachStatusSchema>;

export const PipelineOutreachContextSchema = z.object({
  reasons: z.array(z.string()).default([]),
  neighborhood: z.string().optional(),
  nearestStoreKm: z.number().optional(),
  runId: z.string().optional(),
  coTenantBrands: z.array(z.string()).max(8).optional(),
  verificationLabel: z.string().optional(),
});

export type PipelineOutreachContext = z.infer<typeof PipelineOutreachContextSchema>;

export const PipelineCardSchema = z.object({
  id: z.string().uuid(),
  column: PipelineColumnSchema,
  sortOrder: z.number().int(),
  brandEntityId: z.string(),
  brandName: z.string(),
  propertyAddress: z.string(),
  propertyNeighborhood: z.string().optional(),
  affinityRank: z.number().int(),
  verification: z.string(),
  pitchId: z.string().optional(),
  pitchLink: z.string().optional(),
  reportPath: z.string().optional(),
  notes: z.string().max(5000),
  recipientEmail: z.string().max(320).optional(),
  lastTouchedAt: z.string(),
  followUpAt: z.string().optional(),
  outreachContext: PipelineOutreachContextSchema.optional(),
  outreachDraft: PipelineOutreachDraftSchema.optional(),
  outreachStatus: PipelineOutreachStatusSchema.default('none'),
});

export type PipelineCard = z.infer<typeof PipelineCardSchema>;

export const PipelineBoardSchema = z.object({
  workspaceId: z.string().uuid(),
  shareId: z.string().uuid(),
  cards: z.array(PipelineCardSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PipelineBoard = z.infer<typeof PipelineBoardSchema>;

export const PipelinePublicBoardSchema = z.object({
  shareId: z.string().uuid(),
  cards: z.array(PipelineCardSchema),
  updatedAt: z.string(),
  readOnly: z.literal(true),
});

export type PipelinePublicBoard = z.infer<typeof PipelinePublicBoardSchema>;

export const PipelineAddCardSchema = z.object({
  brandEntityId: z.string(),
  brandName: z.string(),
  propertyAddress: z.string(),
  propertyNeighborhood: z.string().optional(),
  affinityRank: z.number().int(),
  verification: z.string(),
  pitchId: z.string().optional(),
  pitchLink: z.string().optional(),
  reportPath: z.string().optional(),
  outreachContext: PipelineOutreachContextSchema.optional(),
});

export type PipelineAddCard = z.infer<typeof PipelineAddCardSchema>;

export const PipelineUpdateCardSchema = z.object({
  column: PipelineColumnSchema.optional(),
  sortOrder: z.number().int().optional(),
  notes: z.string().max(5000).optional(),
  recipientEmail: z.string().max(320).optional(),
  followUpAt: z.string().nullable().optional(),
  outreachDraft: PipelineOutreachDraftSchema.nullable().optional(),
  outreachStatus: PipelineOutreachStatusSchema.optional(),
});

export type PipelineUpdateCard = z.infer<typeof PipelineUpdateCardSchema>;

export * from './outreach-quality';
