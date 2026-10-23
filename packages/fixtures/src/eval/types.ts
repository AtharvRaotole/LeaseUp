export type EvalSiteDensity = 'urban' | 'suburban' | 'exurban' | 'tourist';

export type EvalMetroRowStatus = 'recorded' | 'pending_qloo';

export interface EvalMetroRow {
  id: string;
  label: string;
  address: string;
  density: EvalSiteDensity;
  status: EvalMetroRowStatus;
  qlooPresentInTop10?: number;
  /** Chain-size baseline (national ATP store count), same pool as Qloo. */
  chainSizePresentInTop10?: number;
  /** Expected present count if 10 brands were drawn uniformly at random from the pool. */
  expectedRandomPresentInTop10?: number;
  liftVsChainSize?: number;
  liftVsRandomExpected?: number;
  precisionAt10Qloo?: number;
  precisionAt10ChainSize?: number;
  brandsInPool?: number;
}

export interface EvalMetrosResults {
  recordedAt: string;
  radiusKm: number;
  qlooSource: 'live' | 'fixtures' | 'none';
  recordingStatus: 'complete' | 'partial' | 'empty';
  recordingNote: string;
  rows: EvalMetroRow[];
  summary?: {
    recordedCount: number;
    meanQlooPresentInTop10: number;
    meanChainSizePresentInTop10: number;
    meanExpectedRandomPresentInTop10: number;
    meanLiftVsChainSize: number;
  };
}

export type StrictEvalPrimaryWinner = 'qloo' | 'chain' | 'tie';

export interface StrictEvalMetroRow {
  id: string;
  label: string;
  address: string;
  density: EvalSiteDensity;
  status: EvalMetroRowStatus;
  metrics?: {
    primaryMetricId: 'spearman_presence';
    searchRadiusKm: number;
    adaptiveRadiusKm: number;
    poolSize: number;
    legacyPresentAt10Qloo: number;
    legacyPresentAt10Chain: number;
    adaptivePresentAt10Qloo: number;
    adaptivePresentAt10Chain: number;
    surprisePresentAt10Qloo: number;
    surprisePresentAt10Chain: number;
    spearmanQloo: number;
    spearmanChain: number;
    randomExpectedPresentAt10: number;
    randomMonteCarloPresentAt10: number;
    primaryWinner: StrictEvalPrimaryWinner;
    qlooBelowChainAdaptive: boolean;
    qlooBelowRandomExpected: boolean;
    honestSummary: string;
  };
}

export interface StrictEvalResults {
  protocolDoc: 'docs/STRICT_EVAL_PROTOCOL.md';
  recordedAt: string;
  primaryMetricId: 'spearman_presence';
  rows: StrictEvalMetroRow[];
  summary?: {
    recordedCount: number;
    meanSpearmanQloo: number;
    meanSpearmanChain: number;
    qlooPrimaryWins: number;
    chainPrimaryWins: number;
    ties: number;
    sitesWhereQlooBelowChainAdaptive: string[];
    sitesWhereLegacySaturated: string[];
  };
}
