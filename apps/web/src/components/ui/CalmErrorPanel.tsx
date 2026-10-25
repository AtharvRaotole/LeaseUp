import { Link } from 'react-router-dom';
import type { ApiErrorInfo } from '../../lib/api-error';
import { calmErrorHeadline, calmErrorNextStep, AUTO_RETRY_STATUS } from '../../lib/calm-error-copy';
import { Button, buttonClassName } from './Button';

export function CalmErrorPanel({
  error,
  onRetry,
  retrying = false,
  testId = 'calm-error',
  homeHref = '/',
}: {
  error: ApiErrorInfo | null;
  onRetry?: () => void;
  retrying?: boolean;
  testId?: string;
  homeHref?: string;
}) {
  if (retrying) {
    return (
      <div
        className="rounded-card border border-border bg-surface-2 px-4 py-3 text-sm text-ink-2"
        data-testid={`${testId}-retrying`}
        role="status"
        aria-live="polite"
      >
        {AUTO_RETRY_STATUS}
      </div>
    );
  }

  if (!error) return null;

  const canRetry = !error.retryAfterSec || error.retryAfterSec <= 0;

  return (
    <div
      className="rounded-card border border-danger/30 bg-surface px-4 py-3 text-sm"
      data-testid={testId}
      role="alert"
    >
      <p className="font-medium text-ink">{calmErrorHeadline(error)}</p>
      <p className="mt-1 text-ink-2">{error.message}</p>
      <p className="mt-2 text-ink-3">{calmErrorNextStep(error)}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {onRetry && (
          <Button type="button" size="sm" variant="secondary" disabled={!canRetry} onClick={onRetry}>
            Try again
          </Button>
        )}
        <Link to={homeHref} className={buttonClassName({ variant: 'ghost', size: 'sm' })}>
          Back to home
        </Link>
      </div>
    </div>
  );
}
