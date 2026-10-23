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
