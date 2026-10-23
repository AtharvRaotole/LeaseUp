import type { AnalysisResponse } from '@leaseup/contracts';
import { Accordion } from '../ui/Accordion';

export function HowWeKnowSection({ results }: { results: AnalysisResponse }) {
  const auc = results.backtest.auc?.toFixed(3) ?? 'n/a';
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
                <li>Qloo Taste AI rankings (mode: {results.mode ?? 'demo'})</li>
                <li>All The Places store locations (CC0)</li>
                <li>OpenStreetMap via Overpass for second-source checks</li>
                <li>Run {results.runId.slice(0, 8)} at {new Date(results.timestamp).toLocaleString()}</li>
              </ul>
            ),
          },
          {
            id: 'method',
            title: 'Method',
            content: (
              <p>
                We rank brands for the pin, then measure how often top-ranked brands already have a real store nearby.
                AUC here is {auc}: the chance a random present store ranks above a random absent one (1.0 is perfect separation).
              </p>
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
                <li>ATP coverage can miss stores; OSM may be unavailable.</li>
                <li>Affinity scores are not calibrated across unrelated API batches.</li>
              </ul>
            ),
          },
        ]}
      />
    </section>
  );
}
