import type { AnalysisStep, AnalysisStepId } from '@leaseup/contracts';

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

export async function runStep<T>(
  emitter: StepEmitter,
  id: AnalysisStepId,
  label: string,
  work: () => Promise<{ summary: string; detail?: Record<string, unknown>; result: T }>
): Promise<T> {
  const started = Date.now();
  await emitter({ id, label, status: 'running' });

  try {
    const { summary, detail, result } = await work();
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
