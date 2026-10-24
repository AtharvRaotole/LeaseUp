import { SegmentedControl } from '../ui/SegmentedControl';
import { InfoTooltip } from '../ui/InfoTooltip';
import { rankingModeTooltip } from '../../lib/broker-copy';

export type QlooRankingMode = 'qloo' | 'baseline';

export function QlooRankingToggle({
  mode,
  onChange,
  className,
  compact = false,
}: {
  mode: QlooRankingMode;
  onChange: (mode: QlooRankingMode) => void;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={className} data-testid="qloo-ranking-toggle">
      <div className="flex items-center gap-1.5">
        <SegmentedControl
          label="Compare ranking"
          value={mode}
          onChange={(v) => onChange(v as QlooRankingMode)}
          options={[
            { value: 'qloo', label: 'Local taste', testId: 'qloo-ranking-mode-qloo' },
            { value: 'baseline', label: 'Chain size', testId: 'qloo-ranking-mode-baseline' },
          ]}
        />
        <InfoTooltip label={rankingModeTooltip(mode)} />
      </div>
      {!compact && (
        <p className="mt-1 text-meta text-ink-3">
          {mode === 'qloo'
            ? 'Same brands, ordered by how well they fit this neighborhood.'
            : 'Same brands, ordered by how many stores they have nationwide.'}
        </p>
      )}
    </div>
  );
}
