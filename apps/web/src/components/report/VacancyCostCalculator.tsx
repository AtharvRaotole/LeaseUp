import { useMemo, useState } from 'react';
import type { VacancyCalculatorInput } from '@leaseup/contracts';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { computeVacancyCost, DEFAULT_VACANCY_INPUT } from '../../lib/vacancy-cost';
import { formatUsd } from '../../lib/format-money';

export function VacancyCostCalculator({
  initial,
  onChange,
  className,
  compact,
}: {
  initial?: VacancyCalculatorInput;
  onChange?: (value: VacancyCalculatorInput) => void;
  className?: string;
  compact?: boolean;
}) {
  const [input, setInput] = useState<VacancyCalculatorInput>(initial ?? DEFAULT_VACANCY_INPUT);

  const update = (patch: Partial<VacancyCalculatorInput>) => {
    const next = { ...input, ...patch };
    setInput(next);
    onChange?.(next);
  };

  const { monthlyLostRent, totalLostRent } = useMemo(() => computeVacancyCost(input), [input]);

  return (
    <Card className={className} data-testid="vacancy-calculator">
      <h3 className={compact ? 'text-base font-semibold text-ink' : 'text-h3 font-semibold text-ink'}>
        Vacancy cost estimate
      </h3>
      <p className="mt-1 text-sm text-ink-2">
        Your inputs only. LeaseUp does not verify rent or square footage.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="text-label uppercase text-ink-3">Square feet</span>
          <Input
            className="mt-1 h-11"
            type="number"
            min={0}
            value={String(input.squareFeet)}
            onChange={(e) => update({ squareFeet: Number(e.target.value) || 0 })}
          />
        </label>
        <label className="block text-sm">
          <span className="text-label uppercase text-ink-3">Rent per sq ft / year</span>
          <Input
            className="mt-1 h-11"
            type="number"
            min={0}
            step="0.5"
            value={String(input.rentPerSqFtYear)}
            onChange={(e) => update({ rentPerSqFtYear: Number(e.target.value) || 0 })}
          />
        </label>
        <label className="block text-sm">
          <span className="text-label uppercase text-ink-3">Months vacant</span>
          <Input
            className="mt-1 h-11"
            type="number"
            min={0}
            step="1"
            value={String(input.monthsVacant)}
            onChange={(e) => update({ monthsVacant: Number(e.target.value) || 0 })}
          />
        </label>
      </div>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-control border border-border bg-surface-2 px-3 py-2">
          <dt className="text-ink-3">Monthly lost rent</dt>
          <dd className="font-mono text-lg tabular-nums text-ink">{formatUsd(monthlyLostRent)}</dd>
        </div>
        <div className="rounded-control border border-border bg-surface-2 px-3 py-2">
          <dt className="text-ink-3">Total over {input.monthsVacant} months</dt>
          <dd className="font-mono text-lg tabular-nums text-accent">{formatUsd(totalLostRent)}</dd>
        </div>
      </dl>
    </Card>
  );
}
