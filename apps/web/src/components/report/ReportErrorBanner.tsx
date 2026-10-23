import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import type { ApiErrorInfo } from '../../lib/api-error';

export function ReportErrorBanner({
  error,
  onRetry,
}: {
  error: ApiErrorInfo;
  onRetry: () => void;
}) {
  const [seconds, setSeconds] = useState(error.retryAfterSec ?? 0);

  useEffect(() => {
    if (!error.retryAfterSec) return;
    setSeconds(error.retryAfterSec);
    const t = window.setInterval(() => {
      setSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [error.retryAfterSec]);

  const canRetry = !error.retryAfterSec || seconds <= 0;

  return (
    <div
      className="rounded-card border border-danger/30 bg-surface px-4 py-3 text-sm text-danger"
      data-testid="report-error"
    >
      <p>{error.message}</p>
      {error.retryAfterSec !== undefined && seconds > 0 && (
        <p className="mt-1 text-ink-2">Try again in {seconds} s.</p>
      )}
      <Button
        className="mt-3"
        size="sm"
        variant="secondary"
        disabled={!canRetry}
        onClick={onRetry}
      >
        Try again
      </Button>
    </div>
  );
}
