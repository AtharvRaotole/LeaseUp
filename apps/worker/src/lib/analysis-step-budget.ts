import type { AnalysisStepId } from '@leaseup/contracts';

/** Hard caps per pipeline step so one provider cannot block the whole report. */
export const ANALYZE_STEP_TIMEOUT_MS: Record<AnalysisStepId, number> = {
  locate: 12_000,
  taste: 10_000,
  backtest: 20_000,
  prospects: 30_000,
  verify: 5_000,
  outreach_ready: 2_000,
};

/** Optional Qloo enrichment after prospects (trade-area taste + shoppers). */
export const ANALYZE_ENRICHMENT_QLOO_BUDGET_MS = 8_000;

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function withSoftTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T | undefined> {
  try {
    return await withTimeout(promise, ms, label);
  } catch {
    return undefined;
  }
}
