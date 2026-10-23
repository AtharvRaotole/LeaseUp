import { SegmentedControl } from '../ui/SegmentedControl';

export type QlooRankingMode = 'raw' | 'blended';

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
        label="Qloo ranking"
        value={mode}
        onChange={(v) => onChange(v as QlooRankingMode)}
        options={[
          { value: 'raw', label: 'Qloo on' },
          { value: 'blended', label: 'Qloo + chain size' },
        ]}
      />
      <p className="mt-1 text-meta text-ink-3">
        {mode === 'raw'
          ? 'Pure local taste ranking from Qloo.'
          : 'Blends Qloo with national store counts to dampen one-off spikes.'}
      </p>
    </div>
  );
}
