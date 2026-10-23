import type { AnalysisRequest, AnalysisResponse, AnalysisStep } from '@leaseup/contracts';
import { apiUrl } from './api';
import { parseApiErrorResponse, type ApiErrorInfo } from './api-error';

export async function analyzeWithStream(
  request: AnalysisRequest,
  handlers: {
    onStep: (step: AnalysisStep) => void;
    onComplete: (result: AnalysisResponse) => void;
    onVerification?: (payload: {
      runId: string;
      prospects: AnalysisResponse['prospects'];
      osmSummary?: {
        verifiedTwoSource: number;
        singleSource: number;
        conflicts: number;
        unavailable: boolean;
      };
    }) => void;
    onError: (error: ApiErrorInfo) => void;
  }
): Promise<void> {
  const response = await fetch(apiUrl('/api/analyze/stream'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok || !response.body) {
    handlers.onError(await parseApiErrorResponse(response));
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() || '';

    for (const chunk of chunks) {
      const lines = chunk.split('\n');
      let event = 'message';
      let data = '';
      for (const line of lines) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        if (line.startsWith('data:')) data = line.slice(5).trim();
      }
      if (!data) continue;

      const payload = JSON.parse(data) as unknown;
      if (event === 'step') handlers.onStep(payload as AnalysisStep);
      if (event === 'complete') handlers.onComplete(payload as AnalysisResponse);
      if (event === 'verification' && handlers.onVerification) {
        handlers.onVerification(
          payload as {
            runId: string;
            prospects: AnalysisResponse['prospects'];
            osmSummary?: {
              verifiedTwoSource: number;
              singleSource: number;
              conflicts: number;
              unavailable: boolean;
            };
          }
        );
      }
      if (event === 'error') {
        const msg = (payload as { message: string }).message;
        handlers.onError({
          message: msg.includes('rate limit') || /too many/i.test(msg)
            ? 'Lots of searches right now. Try again in a minute.'
            : msg || 'Analysis failed. Try again.',
          code: /too many/i.test(msg) ? 'RATE_LIMIT_EXCEEDED' : undefined,
          retryAfterSec: /too many/i.test(msg) ? 60 : undefined,
        });
      }
    }
  }
}
