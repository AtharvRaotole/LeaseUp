import { Input } from '../ui/Input';

export function StorefrontSizeControl({
  sqFt,
  onChange,
}: {
  sqFt: number;
  onChange: (sqFt: number) => void;
}) {
  return (
    <div className="rounded-card border border-border bg-surface px-4 py-3" data-testid="storefront-size">
      <label className="block text-sm" htmlFor="storefront-sqft">
        <span className="text-label uppercase text-ink-3">Storefront size (sq ft)</span>
        <p className="mt-1 text-xs text-ink-3">
          Filters out big-box and format brands that need more space (e.g. IKEA at 25k+ sq ft).
        </p>
        <Input
          id="storefront-sqft"
          type="number"
          min={200}
          max={500000}
          step={100}
          className="mt-2 max-w-[12rem] font-mono tabular-nums"
          value={sqFt}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n) && n >= 200) onChange(n);
          }}
        />
      </label>
    </div>
  );
}
