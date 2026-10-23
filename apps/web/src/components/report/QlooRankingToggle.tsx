import { SegmentedControl } from '../ui/SegmentedControl';

export type QlooRankingMode = 'qloo' | 'baseline';

export function QlooRankingToggle({
  mode,
  onChange,
  className,
}: {
  mode: QlooRankingMode;
  onChange: (mode: QlooRankingMode) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <SegmentedControl
        label="Ranking proof"
        value={mode}
        onChange={(v) => onChange(v as QlooRankingMode)}
        options={[
          { value: 'qloo', label: 'With Qloo' },
          { value: 'baseline', label: 'Rank without Qloo' },
        ]}
      />
      <p className="mt-1 text-meta text-ink-3">
        {mode === 'qloo'
          ? 'Qloo taste order (same brands, ranked by local affinity).'
          : 'Same candidate brands, ranked only by national ATP store count.'}
      </p>
    </div>
  );
}
