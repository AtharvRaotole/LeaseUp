import type { EvalRunRow } from '@leaseup/fixtures';
import {
  loadEvalRunBundle,
  getEvalManifest,
  evalMetricDefinition,
  formatMetricValue,
  loadLiveQlooLiftAggregates,
  loadResultsAdaptive,
  p10ToCountOf10,
} from '@leaseup/fixtures';
import { TopBar } from '../components/layout/TopBar';
import { SiteFooter } from '../components/layout/SiteFooter';
import { TableMetricLabel } from '../components/ui/TableMetricLabel';
import { InfoTooltip } from '../components/ui/InfoTooltip';
import {
  methodologyDensityRadiusTooltip,
  methodologyLikelyRangeTooltip,
  methodologyCatalogMetricTooltip,
  methodologyRankMatchTooltip,
  methodologyTop10HitTooltip,
  methodologyTasteRankTooltip,
} from '../lib/broker-copy';
import { brokerMetricCatalogShortLabel } from '../lib/eval-display';

const evalBundle = loadEvalRunBundle();
const evalManifest = getEvalManifest();
const qlooLift = loadLiveQlooLiftAggregates();
const adaptiveEval = loadResultsAdaptive();

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
      'We score how many physically present chains appear in the top 10 ranked prospects. Dense pins often saturate that legacy metric, so we also publish a metric catalog (adaptive radius, Spearman, chain-residual hits, random baselines) with a swappable results bundle.',
  },
  {
    title: 'Outreach',
    body:
      'Brokers export pitch-ready lists with reasons tied to rank, vacancy math, and map context. LeaseUp does not send email on your behalf.',
  },
] as const;

function metricCell(row: EvalRunRow, metricId: string): string {
  const panel = row.panels?.find((p) => p.id === metricId);
  if (!panel) return 'n/a';
  const def = evalMetricDefinition(metricId);
  const format = def?.format ?? 'decimal';
  const q = panel.qloo !== undefined ? formatMetricValue(format, panel.qloo) : '';
  const c = panel.chain !== undefined ? formatMetricValue(format, panel.chain) : '';
  if (q && c) return `${q} / ${c}`;
  return q || c || 'n/a';
}

export function MethodologyPage() {
  return (
    <div className="min-h-screen bg-bg">
      <TopBar />
      <main id="main-content" className="outline-none">
        <div className="mx-auto max-w-[880px] px-4 pb-16 pt-10 md:pt-14">
          <p className="text-label uppercase text-ink-3">Methodology</p>
          <h1 className="mt-3 font-display font-semibold text-display text-ink">How LeaseUp ranks tenants</h1>
          <p className="mt-4 max-w-[640px] text-lg leading-relaxed text-ink-2">
            A transparent pipeline from address to ranked brands, with backtests against real store
            footprints so judges can see where taste data helps and where it does not.
          </p>

          <section className="mt-12" aria-labelledby="pipeline-heading">
            <h2 id="pipeline-heading" className="font-display font-semibold text-title text-ink">
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
              Evaluation metric catalog
            </h2>
            <p className="mt-2 max-w-[640px] text-sm leading-relaxed text-ink-2">
              Headline metric:{' '}
              {evalManifest.headlineMetricId
                ? evalManifest.headlineMetricId
                : 'pending (live API eval in progress)'}. Bundle:{' '}
              <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">{evalManifest.resultsBundle}</code>{' '}
              ({evalBundle.dataSource}, site set {evalBundle.siteSetId}). Protocol:{' '}
              <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">
                {evalManifest.protocolDoc}
              </code>
              .
            </p>
            {evalBundle.recordingNote && (
              <p className="mt-3 text-sm text-ink-2">{evalBundle.recordingNote}</p>
            )}
            <div className="mt-6 overflow-x-auto rounded-card border border-border" tabIndex={0}>
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <caption className="sr-only">Evaluation metrics by site (Qloo / chain)</caption>
                <thead>
                  <tr className="border-b border-border bg-surface-2 text-label uppercase text-ink-3">
                    <th scope="col" className="px-3 py-3 font-medium">Site</th>
                    {evalManifest.displayMetricIds.map((metricId) => {
                      const def = evalMetricDefinition(metricId);
                      return (
                        <th key={metricId} scope="col" className="px-3 py-3 font-medium text-right">
                          <TableMetricLabel
                            label={brokerMetricCatalogShortLabel(metricId, def?.shortLabel ?? metricId)}
                            tip={methodologyCatalogMetricTooltip(metricId, def?.description)}
                          />
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {evalBundle.rows.map((row) => (
                    <tr key={row.id} className="border-b border-border last:border-0">
                      <th scope="row" className="px-3 py-3 font-medium text-ink">
                        {row.label}
                        {row.status === 'pending_qloo' && (
                          <span className="mt-1 block text-xs font-normal text-ink-3">
                            Pending recording
                          </span>
                        )}
                      </th>
                      {row.status === 'recorded' ? (
                        evalManifest.displayMetricIds.map((metricId) => (
                          <td
                            key={metricId}
                            className={`px-3 py-3 text-right tabular-nums text-ink-2 ${
                              evalManifest.headlineMetricId === metricId ? 'font-medium text-ink' : ''
                            }`}
                          >
                            {metricCell(row, metricId)}
                          </td>
                        ))
                      ) : (
                        <td
                          colSpan={evalManifest.displayMetricIds.length}
                          className="px-3 py-3 text-ink-3"
                        >
                          n/a
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-ink-3">
              Demo-chip sanity checks: <code className="rounded bg-surface-2 px-1">node scripts/strict-eval.mjs</code>.
              Preregistered 40-site bundle:{' '}
              <code className="rounded bg-surface-2 px-1">packages/fixtures/src/eval/results_adaptive.json</code>.
            </p>
          </section>

          <section className="mt-14" aria-labelledby="adaptive-eval-heading">
            <h2 id="adaptive-eval-heading" className="font-display font-semibold text-title text-ink">
              Adaptive-radius evaluation ({adaptiveEval.agg.n_sites} US addresses)
            </h2>
            <p className="mt-2 max-w-[640px] text-sm leading-relaxed text-ink-2">
              Live Qloo study with{' '}
              <span className="inline-flex items-center gap-1">
                tighter store search circles in busy areas
                <InfoTooltip label={methodologyDensityRadiusTooltip()} />
              </span>
              . On average,{' '}
              {p10ToCountOf10(adaptiveEval.agg.p10_blend)} of the top 10 picks already had a store nearby with
              our taste blend, {p10ToCountOf10(adaptiveEval.agg.p10_chain)} of 10 when sorted by chain size
              alone, and {p10ToCountOf10(adaptiveEval.agg.p10_raw)} of 10 with taste order only. Rank match
              among similar-sized chains was {(adaptiveEval.agg.same_size_auc * 100).toFixed(0)}% (likely range{' '}
              {(adaptiveEval.agg.same_size_auc_ci[0] * 100).toFixed(0)}% to{' '}
              {(adaptiveEval.agg.same_size_auc_ci[1] * 100).toFixed(0)}%
              <InfoTooltip label={methodologyLikelyRangeTooltip()} />
              ). Taste scores can still reflect brands that already operate nearby.
            </p>
            <div className="mt-6 overflow-x-auto rounded-card border border-border" tabIndex={0}>
              <table className="w-full min-w-[960px] border-collapse text-left text-sm">
                <caption className="sr-only">Adaptive-radius eval by address</caption>
                <thead>
                  <tr className="border-b border-border bg-surface-2 text-label uppercase text-ink-3">
                    <th scope="col" className="px-3 py-3 font-medium">Site</th>
                    <th scope="col" className="px-3 py-3 font-medium">Stratum</th>
                    <th scope="col" className="px-3 py-3 font-medium text-right">Radius (km)</th>
                    <th scope="col" className="px-3 py-3 font-medium text-right">
                      <TableMetricLabel label="Taste blend" tip={methodologyTop10HitTooltip()} />
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium text-right">
                      <TableMetricLabel label="Chain size" tip="Top 10 hit rate when we sort by national store count only." />
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium text-right">
                      <TableMetricLabel label="Taste order" tip="Top 10 hit rate when we sort by local shopper taste only." />
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium text-right">
                      <TableMetricLabel label="Rank match" tip={methodologyRankMatchTooltip()} />
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium text-right">
                      <TableMetricLabel label="Local taste rank" tip={methodologyTasteRankTooltip()} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {adaptiveEval.per_address.map((row) => (
                    <tr key={row.address} className="border-b border-border last:border-0">
                      <th scope="row" className="px-3 py-3 font-medium text-ink">
                        {row.label}
                      </th>
                      <td className="px-3 py-3 text-ink-2">{row.stratum.replace('_', ' ')}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-ink-2">
                        {row.adaptive_radius_km}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-ink">
                        {p10ToCountOf10(row.p10_blend)} of 10
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-ink-2">
                        {p10ToCountOf10(row.p10_chain)} of 10
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-ink-2">
                        {p10ToCountOf10(row.p10_raw)} of 10
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-ink-2">
                        {row.same_size_auc !== undefined && row.same_size_auc_ci
                          ? `${(row.same_size_auc * 100).toFixed(0)}% (${(row.same_size_auc_ci[0] * 100).toFixed(0)} to ${(row.same_size_auc_ci[1] * 100).toFixed(0)})`
                          : 'n/a'}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-ink-2">
                        {row.taste_percentile !== undefined ? `${row.taste_percentile}` : 'n/a'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-ink-3">
              Source table:{' '}
              <code className="rounded bg-surface-2 px-1">packages/fixtures/src/eval/tables.md</code>
            </p>
          </section>

          <section className="mt-14" aria-labelledby="qloo-lift-heading">
            <h2 id="qloo-lift-heading" className="font-display font-semibold text-title text-ink">
              Qloo lift study (cohort aggregates)
            </h2>
            <p className="mt-2 max-w-[640px] text-sm leading-relaxed text-ink-2">
              Committed headline metrics from the preregistered study ({qlooLift.siteCount} sites). Legacy
              0.75/0.25 blend {(qlooLift.legacyBlendPrecisionAt10 * 100).toFixed(0)}% mean top-10 presence.
              Heatmap features did not add ranking lift; fixed 10 km presence saturates in dense trade areas.
            </p>
            <p className="mt-3 text-xs text-ink-3">
              Write-up:{' '}
              <code className="rounded bg-surface-2 px-1">
                packages/fixtures/src/eval/live-qloo-lift/QLOO_LIFT_EVAL.md
              </code>
            </p>
          </section>

          <section className="mt-14" aria-labelledby="limits-heading">
            <h2 id="limits-heading" className="font-display font-semibold text-title text-ink">
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
