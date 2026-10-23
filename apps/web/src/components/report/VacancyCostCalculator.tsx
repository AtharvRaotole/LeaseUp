import { useMemo, useState } from 'react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Accordion } from '../ui/Accordion';
import {
  computeVacancyCost,
  EMPTY_VACANCY_DRAFT,
  isVacancyInputComplete,
  parseVacancyNumberField,
  type VacancyCalculatorDraft,
} from '../../lib/vacancy-cost';
import { formatUsd } from '../../lib/format-money';

function fieldDisplay(value: number | undefined, readOnly: boolean): string {
  if (value === undefined) return '';
  if (readOnly) return String(value);
  return String(value);
}

export function VacancyCostCalculator({
  initial,
  onChange,
  className,
  compact,
  readOnly,
  showPitchOptIn,
}: {
  initial?: VacancyCalculatorDraft;
  onChange?: (value: VacancyCalculatorDraft) => void;
  className?: string;
  compact?: boolean;
  readOnly?: boolean;
  showPitchOptIn?: boolean;
}) {
  const [draft, setDraft] = useState<VacancyCalculatorDraft>(initial ?? EMPTY_VACANCY_DRAFT);

  const update = (patch: Partial<VacancyCalculatorDraft>) => {
    if (readOnly) return;
    const next = { ...draft, ...patch };
    setDraft(next);
    onChange?.(next);
  };

  const updateNumberField = (key: keyof VacancyCalculatorDraft, raw: string) => {
    if (readOnly) return;
    update({ [key]: parseVacancyNumberField(raw) } as Partial<VacancyCalculatorDraft>);
  };

  const result = useMemo(() => {
    if (!isVacancyInputComplete(draft)) return null;
    return computeVacancyCost(draft);
  }, [draft]);

  const titleClass = compact ? 'text-base font-semibold text-ink' : 'text-h3 font-semibold text-ink';

  return (
    <Card className={className} data-testid="vacancy-calculator">
      <h3 className={titleClass}>What this vacancy costs you</h3>
      <p className="mt-1 text-sm text-ink-2">
        Your numbers only. LeaseUp does not verify rent or square footage.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-label uppercase text-ink-3">Square footage</span>
          <Input
            className="mt-1 h-11"
            type="number"
            min={0}
            inputMode="decimal"
            disabled={readOnly}
            placeholder="Example: 2500"
            value={fieldDisplay(draft.squareFeet, !!readOnly)}
            onChange={(e) => updateNumberField('squareFeet', e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-label uppercase text-ink-3">Asking rent ($/sq ft / year)</span>
          <Input
            className="mt-1 h-11"
            type="number"
            min={0}
            step="0.5"
            inputMode="decimal"
            disabled={readOnly}
            placeholder="Example: $45/sq ft"
            value={fieldDisplay(draft.rentPerSqFtYear, !!readOnly)}
            onChange={(e) => updateNumberField('rentPerSqFtYear', e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-label uppercase text-ink-3">Months vacant so far</span>
          <Input
            className="mt-1 h-11"
            type="number"
            min={0}
            step="1"
            inputMode="numeric"
            disabled={readOnly}
            placeholder="Example: 3"
            value={fieldDisplay(draft.monthsVacant, !!readOnly)}
            onChange={(e) => updateNumberField('monthsVacant', e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-label uppercase text-ink-3">Months to lease with shortlist</span>
          <Input
            className="mt-1 h-11"
            type="number"
            min={0}
            step="1"
            inputMode="numeric"
            disabled={readOnly}
            placeholder="Your estimate"
            value={fieldDisplay(draft.expectedMonthsToLeaseWithShortlist, !!readOnly)}
            onChange={(e) => updateNumberField('expectedMonthsToLeaseWithShortlist', e.target.value)}
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="text-label uppercase text-ink-3">Months to lease without shortlist</span>
          <Input
            className="mt-1 h-11"
            type="number"
            min={0}
            step="1"
            inputMode="numeric"
            disabled={readOnly}
            placeholder="Your estimate"
            value={fieldDisplay(draft.expectedMonthsToLeaseWithoutShortlist, !!readOnly)}
            onChange={(e) => updateNumberField('expectedMonthsToLeaseWithoutShortlist', e.target.value)}
          />
        </label>
      </div>

      {showPitchOptIn && !readOnly && (
        <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 text-sm text-ink-2">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 rounded border-border text-accent focus-visible:ring-2 focus-visible:ring-accent"
            checked={draft.includeInPitchPack}
            onChange={(e) => update({ includeInPitchPack: e.target.checked })}
            data-testid="vacancy-include-pitch"
          />
          <span>Include these vacancy figures in the pitch pack link</span>
        </label>
      )}

      {result ? (
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-control border border-border bg-surface-2 px-3 py-2">
            <dt className="text-ink-3">Lost rent to date</dt>
            <dd className="text-lg tabular-nums text-accent">{formatUsd(result.lostRentToDate)}</dd>
          </div>
          <div className="rounded-control border border-border bg-surface-2 px-3 py-2">
            <dt className="text-ink-3">Monthly carrying cost</dt>
            <dd className="text-lg tabular-nums text-ink">{formatUsd(result.monthlyCarryingCost)}</dd>
          </div>
          <div className="rounded-control border border-border bg-surface-2 px-3 py-2">
            <dt className="text-ink-3">Cost of each extra month</dt>
            <dd className="text-lg tabular-nums text-ink">{formatUsd(result.costPerExtraMonth)}</dd>
          </div>
          {result.extraMonthsWithoutShortlist !== undefined && result.extraCostWithoutShortlist !== undefined && (
            <div className="rounded-control border border-border bg-surface-2 px-3 py-2 sm:col-span-3">
              <dt className="text-ink-3">
                Extra cost from your longer timeline ({result.extraMonthsWithoutShortlist} months)
              </dt>
              <dd className="text-lg tabular-nums text-ink">{formatUsd(result.extraCostWithoutShortlist)}</dd>
            </div>
          )}
        </dl>
      ) : (
        <p className="mt-4 text-sm text-ink-3" data-testid="vacancy-awaiting-input">
          Enter square footage, asking rent, and months vacant to see estimates.
        </p>
      )}

      <div className="mt-4">
        <Accordion
          items={[
            {
              id: 'vacancy-how',
              title: 'How we calculate',
              content: (
                <div className="space-y-2 text-sm text-ink-2">
                  <p>
                    <strong className="font-medium text-ink">Monthly carrying cost</strong> = (square footage ×
                    asking rent per sq ft per year) ÷ 12
                  </p>
                  <p>
                    <strong className="font-medium text-ink">Lost rent to date</strong> = monthly carrying cost ×
                    months vacant so far
                  </p>
                  <p>
                    <strong className="font-medium text-ink">Cost of each extra month</strong> = monthly carrying
                    cost
                  </p>
                  <p>
                    If you enter both lease timelines and months without a shortlist is higher, we multiply the
                    difference in months by monthly carrying cost. We do not assume LeaseUp changes your timeline
                    unless you type those months.
                  </p>
                </div>
              ),
            },
          ]}
        />
      </div>
    </Card>
  );
}
