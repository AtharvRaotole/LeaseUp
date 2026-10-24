import type { AnalysisRequest, AnalysisResponse, AnalysisStep } from '@leaseup/contracts';
import { apiUrl } from './api';
import {
  apiErrorFromNetworkFailure,
  apiErrorFromUnknown,
  humanizeApiError,
  parseApiErrorResponse,
  type ApiErrorInfo,
} from './api-error';
import { fetchWithOneRetry, isNetworkFetchError } from './fetch-with-retry';

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
    onAutoRetry?: () => void;
  }
): Promise<void> {
  let autoRetried = false;
  try {
    const response = await fetchWithOneRetry(
      apiUrl('/api/analyze/stream'),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      },
      {
        onAutoRetry: () => {
          autoRetried = true;
          handlers.onAutoRetry?.();
        },
      }
    );

    if (!response.ok || !response.body) {
      handlers.onError({ ...(await parseApiErrorResponse(response)), autoRetried });
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
          const errPayload = payload as {
            message: string;
            code?: string;
            retryAfterSec?: number;
          };
          const info = humanizeApiError(502, {
            error: errPayload.message,
            code: errPayload.code,
            retryAfter: errPayload.retryAfterSec,
          });
          handlers.onError({ ...info, autoRetried });
        }
      }
    }
  } catch (err) {
    if (isNetworkFetchError(err)) {
      handlers.onError(apiErrorFromNetworkFailure(autoRetried));
      return;
    }
    handlers.onError(apiErrorFromUnknown(err, autoRetried));
  }
}
