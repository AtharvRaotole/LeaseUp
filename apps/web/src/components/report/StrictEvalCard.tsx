import type { AnalysisResponse } from '@leaseup/contracts';
import { Card } from '../ui/Card';
import { Link } from 'react-router-dom';
import {
  brokerPanelTitle,
  evalHeadlineLabel,
  formatPanelValues,
  isHeadlinePanel,
} from '../../lib/eval-display';
import { methodologyRankMatchTooltip } from '../../lib/broker-copy';
import { InfoTooltip } from '../ui/InfoTooltip';
import { getEvalManifest, loadLiveQlooLiftAggregates } from '@leaseup/fixtures';

export function StrictEvalCard({ results }: { results: AnalysisResponse }) {
  const snapshot = results.strictEval;
  if (!snapshot) return null;

  const manifest = getEvalManifest();
  const cohort = loadLiveQlooLiftAggregates();
  const blendPct = (cohort.logisticBlendPrecisionAt10 * 100).toFixed(0);
  const chainPct = (cohort.chainSizePrecisionAt10 * 100).toFixed(0);
  const headlinePending = !snapshot.headlineMetricId && !manifest.headlineMetricId;

  return (
    <Card className="border-border bg-surface-2" data-testid="strict-eval-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-h3 font-semibold text-ink">How the rankings were tested</h3>
          <p className="mt-1 text-sm text-ink-2">
            {evalHeadlineLabel(snapshot)}. Across recorded neighborhoods, {blendPct}% of top picks already had a
            nearby store when we used local taste plus chain size, vs {chainPct}% when we used chain size alone.
            Taste can still favor brands that already operate nearby, so always pair this with store checks on your
            pitch list.
          </p>
        </div>
        <Link to="/methodology#strict-eval-heading" className="text-sm font-medium text-accent">
          Method
        </Link>
      </div>

      {headlinePending && (
        <p className="mt-3 rounded-control border border-border bg-surface px-3 py-2 text-sm text-ink-2">
          Headline metric and site list will be set when the live API eval bundle is recorded. Swap{' '}
          <code className="rounded bg-surface-2 px-1 text-xs">eval/manifest.json</code> and the
          results JSON only.
        </p>
      )}

      <ul className="mt-4 space-y-3">
        {snapshot.panels.map((panel) => {
          const headline = isHeadlinePanel(snapshot, panel.id);
          return (
            <li
              key={panel.id}
              className={`rounded-control border px-3 py-2 ${
                headline ? 'border-accent/40 bg-surface' : 'border-border bg-surface'
              }`}
            >
              <p className="text-label uppercase text-ink-3">
                <span className="inline-flex items-center gap-1">
                  {brokerPanelTitle(panel.id, panel.label)}
                  {panel.id === 'same_size_auc' && (
                    <InfoTooltip label={methodologyRankMatchTooltip()} />
                  )}
                  {headline ? ' (headline)' : ''}
                </span>
              </p>
              <p className="mt-1 font-mono text-sm tabular-nums text-ink">{formatPanelValues(panel)}</p>
              {panel.detail && <p className="mt-1 text-xs text-ink-3">{panel.detail}</p>}
              {panel.description && (
                <p className="mt-1 text-xs text-ink-2">{panel.description}</p>
              )}
              {panel.winner && panel.winner !== 'none' && (
                <p className="mt-1 text-xs capitalize text-ink-2">Vs chain: {panel.winner}</p>
              )}
            </li>
          );
        })}
      </ul>

      {snapshot.notes.length > 0 && (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-ink-2">
          {snapshot.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}
