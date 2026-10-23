import { SegmentedControl } from '../ui/SegmentedControl';

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
    <div className={className}>
      <SegmentedControl
        label="Ranking proof"
        value={mode}
        onChange={(v) => onChange(v as QlooRankingMode)}
        options={[
          { value: 'qloo', label: 'Local taste' },
          { value: 'baseline', label: 'Chain size' },
        ]}
      />
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
