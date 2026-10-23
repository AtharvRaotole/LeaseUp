import type { AnalysisResponse } from '@leaseup/contracts';
import { Accordion } from '../ui/Accordion';
import { ShowMethod } from '../ui/ShowMethod';
import { affinitiesAllIdentical } from '../../lib/fit-display';
import { formatUserFacingDate } from '../../lib/format-date';

export function HowWeKnowSection({ results }: { results: AnalysisResponse }) {
  const auc = results.backtest.auc?.toFixed(3) ?? 'n/a';
  const top10 = (results.rankings ?? []).slice(0, 10);
  const hideFit = affinitiesAllIdentical(top10);

  return (
    <section>
      <h3 className="mb-4 text-h3 font-semibold text-ink">How we know</h3>
      <Accordion
        items={[
          {
            id: 'sources',
            title: 'Data sources',
            content: (
              <ul className="list-disc pl-5 space-y-1">
                <li>Local taste rankings (Qloo, {results.mode ?? 'demo'} mode)</li>
                <li>All The Places store locations (CC0)</li>
                <li>
                  {results.osmSnapshotLabel
                    ? `${results.osmSnapshotLabel} for second-source checks`
                    : 'OpenStreetMap snapshot for second-source checks'}
                </li>
                <li>Run {results.runId.slice(0, 8)} on {formatUserFacingDate(results.timestamp)}</li>
                {hideFit && (
                  <li>
                    Fit scores were identical across the top brands in this recording, so we hid the Fit column.
                  </li>
                )}
              </ul>
            ),
          },
          {
            id: 'limits',
            title: 'Limitations',
            content: (
              <ul className="list-disc pl-5 space-y-1">
                {results.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
                <li>Store datasets can miss locations; street maps may be incomplete.</li>
                <li>Taste scores are not calibrated across unrelated API batches.</li>
              </ul>
            ),
          },
        ]}
      />
      <div className="mt-4">
      <ShowMethod>
        <p>
          We rank brands for the pin, then measure how often top-ranked brands already have a real store
          nearby. Precision at 10 (P@10) counts how many of the top 10 already have a store in your trade area.
          AUC here is {auc}: the chance a random present store ranks above a random absent one
          (1.0 is perfect separation).
        </p>
      </ShowMethod>
      </div>
    </section>
  );
}
