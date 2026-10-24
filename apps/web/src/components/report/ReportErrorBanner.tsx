import { useEffect, useState } from 'react';
import type { ApiErrorInfo } from '../../lib/api-error';
import { CalmErrorPanel } from '../ui/CalmErrorPanel';

export function ReportErrorBanner({
  error,
  onRetry,
  retrying = false,
}: {
  error: ApiErrorInfo | null;
  onRetry: () => void;
  retrying?: boolean;
}) {
  const [seconds, setSeconds] = useState(error?.retryAfterSec ?? 0);

  useEffect(() => {
    if (!error?.retryAfterSec) return;
    setSeconds(error.retryAfterSec);
    const t = window.setInterval(() => {
      setSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [error?.retryAfterSec]);

  if (!error && !retrying) return null;

  const canRetry = !error?.retryAfterSec || seconds <= 0;

  return (
    <div data-testid="report-error">
      <CalmErrorPanel
        error={retrying ? null : error}
        retrying={retrying}
        onRetry={canRetry ? onRetry : undefined}
        testId="report-error-panel"
      />
      {!retrying &&
        error?.code !== 'DAILY_LIMIT_REACHED' &&
        error?.retryAfterSec !== undefined &&
        seconds > 0 && (
        <p className="mt-2 text-sm text-ink-2">Try again in {seconds} s.</p>
      )}
    </div>
  );
}
