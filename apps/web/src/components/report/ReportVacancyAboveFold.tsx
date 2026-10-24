import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import {
  monthlyCarryingFromDraft,
  parseVacancyNumberField,
  type VacancyCalculatorDraft,
} from '../../lib/vacancy-cost';
import {
  vacancyAboveFoldIntro,
  vacancyAboveFoldPrompt,
  vacancyMonthlyEmptyHeadline,
} from '../../lib/vacancy-cost-copy';

function fieldDisplay(value: number | undefined): string {
  return value === undefined ? '' : String(value);
}

export function ReportVacancyAboveFold({
  draft,
  onChange,
}: {
  draft: VacancyCalculatorDraft;
  onChange: (next: VacancyCalculatorDraft) => void;
}) {
  const monthly = monthlyCarryingFromDraft(draft);

  const updateNumberField = (key: 'squareFeet' | 'rentPerSqFtYear', raw: string) => {
    onChange({ ...draft, [key]: parseVacancyNumberField(raw) });
  };

  return (
    <Card className="print-pitch-block" data-testid="vacancy-above-fold">
      <h3 className="font-display text-h3 font-semibold text-ink">Vacancy cost</h3>
      <p className="mt-1 text-sm text-ink-2">{vacancyAboveFoldIntro()}</p>

      {monthly !== null ? (
        <p className="mt-4 text-body font-medium text-ink" data-testid="vacancy-monthly-headline">
          {vacancyMonthlyEmptyHeadline(monthly)}
        </p>
      ) : (
        <p className="mt-4 text-sm text-ink-3" data-testid="vacancy-above-fold-prompt">
          {vacancyAboveFoldPrompt()}
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-label uppercase text-ink-3">Square footage</span>
          <Input
            className="mt-1 h-11"
            type="number"
            min={0}
            inputMode="decimal"
            placeholder="Example: 2500"
            value={fieldDisplay(draft.squareFeet)}
            onChange={(e) => updateNumberField('squareFeet', e.target.value)}
            data-testid="vacancy-above-sqft"
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
            placeholder="Example: 45"
            value={fieldDisplay(draft.rentPerSqFtYear)}
            onChange={(e) => updateNumberField('rentPerSqFtYear', e.target.value)}
            data-testid="vacancy-above-rent"
          />
        </label>
      </div>

      <p className="mt-3 text-meta text-ink-3">
        <a href="#report-vacancy-costs" className="text-accent underline-offset-2 hover:underline">
          Months vacant and lease timelines
        </a>{' '}
        are in the full calculator below.
      </p>
    </Card>
  );
}
