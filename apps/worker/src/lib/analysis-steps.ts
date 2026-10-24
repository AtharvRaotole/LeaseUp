import type { AnalysisStep, AnalysisStepId } from '@leaseup/contracts';
import { ANALYZE_STEP_TIMEOUT_MS, withTimeout } from './analysis-step-budget';

export const STEP_DEFINITIONS: Array<{ id: AnalysisStepId; label: string }> = [
  { id: 'locate', label: 'Locate storefront' },
  { id: 'taste', label: "Read the neighborhood's taste (Qloo)" },
  { id: 'backtest', label: 'Prove it (backtest)' },
  { id: 'prospects', label: "Find who's missing" },
  { id: 'verify', label: 'Double-check absence (ATP + OSM)' },
  { id: 'outreach_ready', label: 'Draft outreach (on demand)' },
];

export function initialSteps(): AnalysisStep[] {
  return STEP_DEFINITIONS.map((step) => ({
    id: step.id,
    label: step.label,
    status: 'pending',
  }));
}

export type StepEmitter = (step: AnalysisStep) => void | Promise<void>;

export async function emitAnalyzeKickoff(emitter: StepEmitter): Promise<void> {
  const locate = STEP_DEFINITIONS[0]!;
  await emitter({ id: locate.id, label: locate.label, status: 'running' });
}

export async function runStep<T>(
  emitter: StepEmitter,
  id: AnalysisStepId,
  label: string,
  work: () => Promise<{ summary: string; detail?: Record<string, unknown>; result: T }>,
  timeoutMs = ANALYZE_STEP_TIMEOUT_MS[id]
): Promise<T> {
  const started = Date.now();
  await emitter({ id, label, status: 'running' });

  try {
    const { summary, detail, result } = await withTimeout(work(), timeoutMs, `analyze step ${id}`);
    await emitter({
      id,
      label,
      status: 'complete',
      durationMs: Date.now() - started,
      summary,
      detail,
    });
    return result;
  } catch (error) {
    await emitter({
      id,
      label,
      status: 'error',
      durationMs: Date.now() - started,
      summary: (error as Error).message,
    });
    throw error;
  }
}
