import { InfoTooltip } from './InfoTooltip';

/** Column header label with a one-line broker explanation (keyboard and mobile friendly). */
export function TableMetricLabel({ label, tip }: { label: string; tip: string }) {
  return (
    <span className="inline-flex items-center justify-end gap-1">
      <span>{label}</span>
      <InfoTooltip label={tip} side="bottom" />
    </span>
  );
}
