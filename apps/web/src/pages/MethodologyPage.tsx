import type { EvalMetroRow, EvalMetrosResults, StrictEvalResults } from '@leaseup/fixtures';
import evalResults from '@leaseup/fixtures/eval/results.json';
import strictEvalResults from '@leaseup/fixtures/eval/strict-results.json';
import { TopBar } from '../components/layout/TopBar';
import { SiteFooter } from '../components/layout/SiteFooter';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

const data = evalResults as EvalMetrosResults;
const strictData = strictEvalResults as StrictEvalResults;

const PIPELINE = [
  {
    title: 'Geocode the pin',
    body:
      'We resolve the storefront address to a latitude and longitude, then draw a search radius (default 10 km) around that pin.',
  },
  {
    title: 'Qloo heatmap and insights',
    body:
      'Qloo Taste AI returns brand affinity for the trade area: ranked insights for tracked chains and optional heatmap cells for site selection.',
  },
  {
    title: 'Store absence check',
    body:
      'For each candidate brand we ask whether All The Places already lists a store inside the radius. OpenStreetMap adds a second source on demo chips for street-level checks.',
  },
  {
    title: 'Backtest',
    body:
      'We score how many physically present chains appear in the top 10 ranked prospects. Dense pins often saturate that legacy metric, so we also run the strict evaluation (Spearman, adaptive radius, chain-residual hits, random baselines).',
  },
  {
    title: 'Outreach',
    body:
      'Brokers export pitch-ready lists with reasons tied to rank, vacancy math, and map context. LeaseUp does not send email on your behalf.',
  },
] as const;

function formatRecordedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function formatCount(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

function liftLabel(row: EvalMetroRow): string {
  if (row.liftVsChainSize === undefined) return 'n/a';
  if (row.liftVsChainSize > 0) return `+${row.liftVsChainSize} vs chain size`;
  if (row.liftVsChainSize < 0) return `${row.liftVsChainSize} vs chain size`;
  return 'Tied vs chain size';
}

export function MethodologyPage() {
  const recorded = data.rows.filter((r) => r.status === 'recorded');
  const pending = data.rows.filter((r) => r.status === 'pending_qloo');

  return (
    <div className="min-h-screen bg-bg">
      <TopBar />
      <main id="main-content" className="outline-none">
        <div className="mx-auto max-w-[880px] px-4 pb-16 pt-10 md:pt-14">
          <p className="text-label uppercase text-ink-3">Methodology</p>
          <h1 className="mt-3 font-serif text-display text-ink">How LeaseUp ranks tenants</h1>
          <p className="mt-4 max-w-[640px] text-lg leading-relaxed text-ink-2">
            A transparent pipeline from address to ranked brands, with backtests against real store
            footprints so judges can see where taste data helps and where it does not.
          </p>

          <section className="mt-12" aria-labelledby="pipeline-heading">
            <h2 id="pipeline-heading" className="font-serif text-title text-ink">
              Pipeline
            </h2>
            <p className="mt-2 text-sm text-ink-2">
              Each report run follows the same steps. Numbers below come from recorded evaluation
              runs, not copy-pasted marketing stats.
            </p>
            <ol className="mt-8 space-y-0">
              {PIPELINE.map((step, index) => (
                <li key={step.title} className="relative flex gap-4 pb-10 last:pb-0">
                  {index < PIPELINE.length - 1 && (
                    <span
                      className="absolute left-[15px] top-9 bottom-0 w-px bg-border"
                      aria-hidden
                    />
                  )}
                  <span
                    className="relative z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface text-sm font-semibold text-ink"
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  <div className="pt-0.5">
                    <h3 className="font-semibold text-ink">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-2">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-14" aria-labelledby="strict-eval-heading">
            <h2 id="strict-eval-heading" className="font-serif text-title text-ink">
              Strict evaluation (pre-registered)
            </h2>
            <p className="mt-2 max-w-[640px] text-sm leading-relaxed text-ink-2">
              Before reading metro scores we fixed the primary metric to{' '}
              <strong className="font-medium text-ink">Spearman rank correlation</strong> between Qloo
              order and ATP store presence. Legacy present-in-top-10 can read 10 of 10 in Chicago and
              similar corridors while still hiding ordering signal. Full rules:{' '}
              <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">
                docs/STRICT_EVAL_PROTOCOL.md
              </code>
              .
            </p>
            {strictData.summary && (
              <p className="mt-3 text-sm text-ink-2">
                Recorded {strictData.summary.recordedCount} sites. Mean Spearman: Qloo{' '}
                {strictData.summary.meanSpearmanQloo.toFixed(3)}, chain{' '}
                {strictData.summary.meanSpearmanChain.toFixed(3)}. Primary wins: Qloo{' '}
                {strictData.summary.qlooPrimaryWins}, chain {strictData.summary.chainPrimaryWins},
                ties {strictData.summary.ties}.
                {strictData.summary.sitesWhereQlooBelowChainAdaptive.length > 0 && (
                  <>
                    {' '}
                    Qloo adaptive P@10 trails chain size on{' '}
                    {strictData.summary.sitesWhereQlooBelowChainAdaptive.join(', ')}.
                  </>
                )}
              </p>
            )}
            <div className="mt-6 overflow-x-auto rounded-card border border-border">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <caption className="sr-only">Strict evaluation by site</caption>
                <thead>
                  <tr className="border-b border-border bg-surface-2 text-label uppercase text-ink-3">
                    <th scope="col" className="px-3 py-3 font-medium">Site</th>
                    <th scope="col" className="px-3 py-3 font-medium text-right">Legacy P@10</th>
                    <th scope="col" className="px-3 py-3 font-medium text-right">Adaptive P@10</th>
                    <th scope="col" className="px-3 py-3 font-medium text-right">Spearman</th>
                    <th scope="col" className="px-3 py-3 font-medium text-right">Surprise hits</th>
                    <th scope="col" className="px-3 py-3 font-medium">Primary</th>
                  </tr>
                </thead>
                <tbody>
                  {strictData.rows.map((row) => (
                    <tr key={row.id} className="border-b border-border last:border-0">
                      <th scope="row" className="px-3 py-3 font-medium text-ink">
                        {row.label}
                        {row.status === 'pending_qloo' && (
                          <span className="mt-1 block text-xs font-normal text-ink-3">
                            Needs live Qloo recording
                          </span>
                        )}
                      </th>
                      {row.status === 'recorded' && row.metrics ? (
                        <>
                          <td className="px-3 py-3 text-right tabular-nums text-ink-2">
                            {row.metrics.legacyPresentAt10Qloo} / {row.metrics.legacyPresentAt10Chain}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-ink-2">
                            {row.metrics.adaptivePresentAt10Qloo} / {row.metrics.adaptivePresentAt10Chain}{' '}
                            <span className="text-ink-3">({row.metrics.adaptiveRadiusKm} km)</span>
                          </td>
                          <td className="px-3 py-3 text-right font-mono tabular-nums text-ink">
                            {row.metrics.spearmanQloo.toFixed(3)} / {row.metrics.spearmanChain.toFixed(3)}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-ink-2">
                            {row.metrics.surprisePresentAt10Qloo} / {row.metrics.surprisePresentAt10Chain}
                          </td>
                          <td className="px-3 py-3 capitalize text-ink-2">{row.metrics.primaryWinner}</td>
                        </>
                      ) : (
                        <td colSpan={5} className="px-3 py-3 text-ink-3">n/a</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-ink-3">
              Recompute: <code className="rounded bg-surface-2 px-1">node scripts/strict-eval.mjs</code>
              . Bleecker St needs <code className="rounded bg-surface-2 px-1">QLOO_API_KEY</code>.
            </p>
          </section>

          <section className="mt-14" aria-labelledby="eval-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="eval-heading" className="font-serif text-title text-ink">
                  Metro evaluation
                </h2>
                <p className="mt-2 text-sm text-ink-2">
                  {data.radiusKm} km radius. Present-in-top-10 counts use All The Places inside the
                  radius (227 tracked chains).
                </p>
              </div>
              <Badge tone={data.recordingStatus === 'complete' ? 'success' : 'warn'}>
                {data.recordingStatus === 'complete'
                  ? 'Full recording'
                  : data.recordingStatus === 'partial'
                    ? `${recorded.length} of ${data.rows.length} recorded`
                    : 'Awaiting recording'}
              </Badge>
            </div>

            {data.recordingStatus !== 'complete' && (
              <Card className="mt-6 border-warn/30 bg-surface-2 p-4 text-sm text-ink-2">
                <p className="font-medium text-ink">{data.recordingNote}</p>
                {pending.length > 0 && (
                  <p className="mt-2 text-ink-3">
                    Pending metros need a live Qloo run via{' '}
                    <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">scripts/eval-metros.mjs</code>.
                  </p>
                )}
              </Card>
            )}

            {data.recordingStatus === 'empty' ? (
              <p className="mt-6 text-sm text-ink-2">
                No evaluation rows yet. Run the recording script on a machine with{' '}
                <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">QLOO_API_KEY</code>.
              </p>
            ) : (
              <>
                <div className="mt-6 overflow-x-auto rounded-card border border-border">
                  <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                    <caption className="sr-only">
                      Qloo ranking vs baselines by metro
                    </caption>
                    <thead>
                      <tr className="border-b border-border bg-surface-2 text-label uppercase text-ink-3">
                        <th scope="col" className="px-3 py-3 font-medium">Metro</th>
                        <th scope="col" className="px-3 py-3 font-medium">Density</th>
                        <th scope="col" className="px-3 py-3 font-medium text-right">
                          Qloo top 10
                        </th>
                        <th scope="col" className="px-3 py-3 font-medium text-right">
                          Chain size top 10
                        </th>
                        <th scope="col" className="px-3 py-3 font-medium text-right">
                          Random expected
                        </th>
                        <th scope="col" className="px-3 py-3 font-medium">Lift</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((row) => (
                        <tr key={row.id} className="border-b border-border last:border-0">
                          <th scope="row" className="px-3 py-3 font-medium text-ink">
                            {row.label}
                            {row.status === 'pending_qloo' && (
                              <span className="mt-1 block text-xs font-normal text-ink-3">
                                Pending Qloo recording
                              </span>
                            )}
                          </th>
                          <td className="px-3 py-3 capitalize text-ink-2">{row.density}</td>
                          {row.status === 'recorded' ? (
                            <>
                              <td className="px-3 py-3 text-right tabular-nums text-ink">
                                {row.qlooPresentInTop10} of 10
                              </td>
                              <td className="px-3 py-3 text-right tabular-nums text-ink-2">
                                {row.chainSizePresentInTop10} of 10
                              </td>
                              <td className="px-3 py-3 text-right tabular-nums text-ink-2">
                                {formatCount(row.expectedRandomPresentInTop10 ?? 0)} of 10
                              </td>
                              <td className="px-3 py-3 text-ink-2">{liftLabel(row)}</td>
                            </>
                          ) : (
                            <td colSpan={4} className="px-3 py-3 text-ink-3">
                              n/a
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {data.summary && (
                  <p className="mt-4 text-sm text-ink-2">
                    Recorded {data.summary.recordedCount} metros (source: {data.qlooSource}). Mean
                    present in top 10: Qloo {formatCount(data.summary.meanQlooPresentInTop10)}, chain
                    size {formatCount(data.summary.meanChainSizePresentInTop10)}, random expected{' '}
                    {formatCount(data.summary.meanExpectedRandomPresentInTop10)}. Recorded at{' '}
                    {formatRecordedAt(data.recordedAt)}.
                  </p>
                )}
              </>
            )}
          </section>

          <section className="mt-14" aria-labelledby="limits-heading">
            <h2 id="limits-heading" className="font-serif text-title text-ink">
              Limitations and data sources
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-2">
              <li>
                Store presence uses the All The Places snapshot embedded in LeaseUp (Oct 2026, CC0).
                Brands outside the 227-chain panel are excluded from backtests.
              </li>
              <li>
                Qloo insights reflect hackathon API coverage (recorded Oct 2026). Live mode requires{' '}
                <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">QLOO_API_KEY</code>.
              </li>
              <li>
                OpenStreetMap verification is available on demo chip reports; it is not repeated for
                every row in the metro table.
              </li>
              <li>
                Chain-size baseline sorts the same Qloo candidate pool by national store count; random
                expected is the hypergeometric mean of drawing 10 brands without taste.
              </li>
              <li>
                Outreach and vacancy math are broker inputs; they are not verified against third-party
                lease comps.
              </li>
            </ul>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
