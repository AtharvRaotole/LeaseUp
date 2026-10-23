import type { EvalMetricPanel } from './present-metrics.js';
import type { StrictEvalSiteMetrics } from '../strict-eval.js';

export type EvalSiteDensity = 'urban' | 'suburban' | 'exurban' | 'tourist';

export type EvalMetroRowStatus = 'recorded' | 'pending_qloo';

export interface EvalMetroRow {
  id: string;
  label: string;
  address: string;
  density: EvalSiteDensity;
  status: EvalMetroRowStatus;
  qlooPresentInTop10?: number;
  chainSizePresentInTop10?: number;
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

export type EvalRunRow = {
  id: string;
  label: string;
  address: string;
  density: EvalSiteDensity;
  status: EvalMetroRowStatus;
  panels?: EvalMetricPanel[];
  siteMetrics?: StrictEvalSiteMetrics;
};

export type EvalRunBundle = {
  manifestId: string;
  recordedAt: string;
  dataSource: string;
  siteSetId: string;
  recordingNote?: string;
  rows: EvalRunRow[];
  summary?: Record<string, unknown>;
};
