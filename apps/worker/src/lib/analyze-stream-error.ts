import { LiveQlooJudgeQuotaError } from './live-qloo-judge-quota';
import { GeocodeAmbiguousError, GeocodeInputError, GeocodeNotFoundError, UpstreamError } from './errors';

export type AnalyzeStreamErrorPayload = {
  message: string;
  code?: string;
  retryAfterSec?: number;
};

export function analyzeStreamErrorPayload(err: unknown): AnalyzeStreamErrorPayload {
  if (err instanceof LiveQlooJudgeQuotaError) {
    return { message: err.message, code: err.code, retryAfterSec: err.retryAfterSec };
  }
  if (err instanceof GeocodeInputError || err instanceof GeocodeNotFoundError) {
    return { message: err.message, code: err.code };
  }
  if (err instanceof GeocodeAmbiguousError) {
    return { message: err.message, code: err.code };
  }
  if (err instanceof UpstreamError) {
    return {
      message: err.userMessage ?? err.message,
      code: err.code ?? 'UPSTREAM_ERROR',
      retryAfterSec: err.code === 'QLOO_UNAVAILABLE' ? 30 : undefined,
    };
  }
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  return { message, code: 'INTERNAL_ERROR' };
}
