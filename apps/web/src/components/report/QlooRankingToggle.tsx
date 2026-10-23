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
          { value: 'qloo', label: 'With Qloo' },
          { value: 'baseline', label: 'Without taste' },
        ]}
      />
      {!compact && (
        <p className="mt-1 text-meta text-ink-3">
          {mode === 'qloo'
            ? 'Qloo taste order (same brands, ranked by local affinity).'
            : 'Same candidate brands, ranked only by national ATP store count.'}
        </p>
      )}
    </div>
  );
}
