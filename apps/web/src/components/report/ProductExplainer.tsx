import { REPORT_PLAIN_SUMMARY } from '../../lib/broker-copy';

export function ProductExplainer({
  className = '',
  testId = 'product-explainer',
}: {
  className?: string;
  testId?: string;
}) {
  return (
    <p
      className={`text-sm leading-relaxed text-ink-2 ${className}`}
      data-testid={testId}
    >
      {REPORT_PLAIN_SUMMARY}
    </p>
  );
}
