import type { AnalysisResponse, StrictEvalSnapshot } from '@leaseup/contracts';
import { Card } from '../ui/Card';
import { Link } from 'react-router-dom';

function formatRho(value: number): string {
  return value.toFixed(3);
}

function formatCount(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

function primaryWinnerLabel(winner: StrictEvalSnapshot['primaryWinner']): string {
  if (winner === 'qloo') return 'Qloo leads on Spearman';
  if (winner === 'chain') return 'Chain size leads on Spearman';
  return 'Spearman tie band';
}

export function StrictEvalCard({ results }: { results: AnalysisResponse }) {
  const eval_ = results.strictEval;
  if (!eval_) return null;

  const legacySaturated =
    eval_.legacyPresentAt10Qloo >= 10 && eval_.legacyPresentAt10Chain >= 10;

  return (
    <Card className="border-border bg-surface-2" data-testid="strict-eval-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-h3 font-semibold text-ink">Strict evaluation</h3>
          <p className="mt-1 text-sm text-ink-2">
            Primary metric: Spearman rank vs store presence (pre-registered in{' '}
            <code className="rounded bg-surface px-1 py-0.5 text-xs">STRICT_EVAL_PROTOCOL</code>).
            Legacy P@10 can saturate in dense trade areas.
          </p>
        </div>
        <Link to="/methodology#strict-eval-heading" className="text-sm font-medium text-accent">
          Method
        </Link>
      </div>

      {legacySaturated && (
        <p className="mt-3 rounded-control border border-warn/30 bg-surface px-3 py-2 text-sm text-ink-2">
          Legacy hit rate is 10 of 10 for both taste and chain size here. Use Spearman and the
          tighter {eval_.adaptiveRadiusKm} km radius below.
        </p>
      )}

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-control border border-border bg-surface px-3 py-2">
          <dt className="text-label uppercase text-ink-3">Spearman (primary)</dt>
          <dd className="mt-1 font-mono text-lg tabular-nums text-ink">
            Qloo {formatRho(eval_.spearmanQloo)} · chain {formatRho(eval_.spearmanChain)}
          </dd>
          <dd className="mt-1 text-xs text-ink-2">{primaryWinnerLabel(eval_.primaryWinner)}</dd>
        </div>
        <div className="rounded-control border border-border bg-surface px-3 py-2">
          <dt className="text-label uppercase text-ink-3">
            Adaptive P@10 ({eval_.adaptiveRadiusKm} km)
          </dt>
          <dd className="mt-1 font-mono text-lg tabular-nums text-ink">
            Qloo {eval_.adaptivePresentAt10Qloo} of 10 · chain {eval_.adaptivePresentAt10Chain} of
            10
          </dd>
          {eval_.qlooBelowChainAdaptive && (
            <dd className="mt-1 text-xs text-warn">
              Qloo is below chain size on this tighter radius.
            </dd>
          )}
        </div>
        <div className="rounded-control border border-border bg-surface px-3 py-2">
          <dt className="text-label uppercase text-ink-3">Chain-residual hits</dt>
          <dd className="mt-1 font-mono text-lg tabular-nums text-ink">
            Qloo {eval_.surprisePresentAt10Qloo} · chain {eval_.surprisePresentAt10Chain}
          </dd>
          <dd className="mt-1 text-xs text-ink-2">
            Present in adaptive radius, not in chain top 10
          </dd>
        </div>
        <div className="rounded-control border border-border bg-surface px-3 py-2">
          <dt className="text-label uppercase text-ink-3">Random baselines</dt>
          <dd className="mt-1 font-mono text-sm tabular-nums text-ink">
            Expected {formatCount(eval_.randomExpectedPresentAt10)} of 10 · Monte Carlo{' '}
            {formatCount(eval_.randomMonteCarloPresentAt10)} of 10
          </dd>
          <dd className="mt-1 text-xs text-ink-2">
            Legacy Qloo {eval_.legacyPresentAt10Qloo} of 10 at {eval_.searchRadiusKm} km
          </dd>
        </div>
      </dl>

      <p className="mt-4 text-sm text-ink-2">{eval_.honestSummary}</p>
    </Card>
  );
}
