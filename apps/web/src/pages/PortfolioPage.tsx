import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { PortfolioResponse, PortfolioRow } from '@leaseup/contracts';
import { Building2, Upload } from 'lucide-react';
import { TopBar } from '../components/layout/TopBar';
import { Button, buttonClassName } from '../components/ui/Button';
import { PageEmptyState } from '../components/ui/PageEmptyState';
import { PortfolioLoadingSkeleton } from '../components/portfolio/PortfolioLoadingSkeleton';
import { portfolioEmptyAction, portfolioEmptyLine } from '../lib/empty-state-copy';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { apiUrl } from '../lib/api';
import { buildReportPath } from '../lib/report-params';
import { CalmErrorPanel } from '../components/ui/CalmErrorPanel';
import type { ApiErrorInfo } from '../lib/api-error';
import { SERVER_BUSY_MESSAGE } from '../lib/calm-error-copy';
import { applyPortfolioSseMessage, parsePortfolioSseBlock } from '../lib/portfolio-sse';

type SortKey = 'property' | 'neighborhood' | 'hitRate' | 'status';

function parseAddressesFromCsv(text: string): string[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const header = lines[0]!.toLowerCase();
  const hasHeader = header.includes('address');
  const start = hasHeader ? 1 : 0;
  const colIndex = hasHeader
    ? header.split(',').findIndex((c) => c.includes('address'))
    : 0;
  const out: string[] = [];
  for (let i = start; i < lines.length && out.length < 10; i++) {
    const parts = lines[i]!.split(',');
    const cell = (colIndex >= 0 ? parts[colIndex] : parts[0])?.trim();
    if (cell) out.push(cell);
  }
  return out;
}

function portfolioErrorInfo(message: string): ApiErrorInfo {
  if (/missing|not found|expired/i.test(message)) {
    return { message, code: 'NOT_FOUND' };
  }
  if (/csv|address column/i.test(message)) {
    return { message, code: 'VALIDATION' };
  }
  return { message: SERVER_BUSY_MESSAGE, code: 'SERVER_BUSY' };
}

function statusLabel(status: PortfolioRow['status']): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'geocoding':
      return 'Geocoding';
    case 'ambiguous':
      return 'Needs confirmation';
    case 'ready':
      return 'Ready to analyze';
    case 'analyzing':
      return 'Analyzing';
    case 'complete':
      return 'Complete';
    case 'error':
      return 'Error';
    default:
      return status;
  }
}

export function PortfolioPage() {
  const { id } = useParams();
  const [draft, setDraft] = useState('');
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('property');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const loadPortfolio = useCallback(async (portfolioId: string) => {
    const res = await fetch(apiUrl(`/api/portfolio/${portfolioId}`));
    if (!res.ok) throw new Error('This portfolio link is missing or expired.');
    setPortfolio((await res.json()) as PortfolioResponse);
  }, []);

  const createPortfolio = async (addresses: string[]) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(apiUrl('/api/portfolio'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || 'We could not start this portfolio. Try again in a moment.');
      }
      const data = (await res.json()) as PortfolioResponse;
      setPortfolio(data);
      window.history.replaceState(null, '', `/portfolio/${data.id}`);
      return data;
    } finally {
      setBusy(false);
    }
  };

  const runPortfolio = async (portfolioId: string) => {
    setBusy(true);
    setError(null);
    const poll = window.setInterval(() => {
      void loadPortfolio(portfolioId).catch(() => undefined);
    }, 2000);

    try {
      const res = await fetch(apiUrl(`/api/portfolio/${portfolioId}/run`), { method: 'POST' });
      if (!res.ok || !res.body) {
        setError('We could not run analyses right now. Try again in a moment.');
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';
        for (const chunk of chunks) {
          const message = parsePortfolioSseBlock(chunk);
          if (!message) continue;
          setPortfolio((prev) => applyPortfolioSseMessage(prev, message));
        }
      }
    } finally {
      window.clearInterval(poll);
      setBusy(false);
      try {
        await loadPortfolio(portfolioId);
      } catch {
        /* keep last SSE state */
      }
    }
  };

  const confirmRow = async (rowId: string, candidateIndex: number) => {
    if (!portfolio) return;
    const res = await fetch(apiUrl(`/api/portfolio/${portfolio.id}/confirm`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rowId, candidateIndex }),
    });
    if (!res.ok) return;
    setPortfolio((await res.json()) as PortfolioResponse);
  };

  const submitDraft = async () => {
    const lines = draft
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 10);
    if (lines.length === 0) return;
    const created = await createPortfolio(lines);
    if (created.rows.some((r) => r.status === 'ambiguous')) return;
    if (created.rows.every((r) => r.status === 'ready')) {
      await runPortfolio(created.id);
    }
  };

  const onCsv = async (file: File) => {
    const text = await file.text();
    const addresses = parseAddressesFromCsv(text);
    if (addresses.length === 0) {
      setError('CSV needs an address column or one address per line.');
      return;
    }
    setDraft(addresses.join('\n'));
  };

  const sortedRows = useMemo(() => {
    if (!portfolio) return [];
    const rows = [...portfolio.rows];
    rows.sort((a, b) => {
      if (sortKey === 'hitRate') {
        const delta = (a.backtestHitRate ?? -1) - (b.backtestHitRate ?? -1);
        return sortDir === 'asc' ? delta : -delta;
      }
      const av =
        sortKey === 'property'
          ? a.inputAddress
          : sortKey === 'neighborhood'
            ? a.neighborhood ?? ''
            : a.status;
      const bv =
        sortKey === 'property'
          ? b.inputAddress
          : sortKey === 'neighborhood'
            ? b.neighborhood ?? ''
            : b.status;
      const cmp = av.localeCompare(bv);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [portfolio, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  useEffect(() => {
    if (!id) return;
    setLoadingPortfolio(true);
    void loadPortfolio(id)
      .catch(() => setError('This portfolio link is missing or expired.'))
      .finally(() => setLoadingPortfolio(false));
  }, [id, loadPortfolio]);

  useEffect(() => {
    if (!id) return;
    const needsPoll =
      busy ||
      portfolio?.rows.some((r) => r.status === 'analyzing' || r.status === 'geocoding');
    if (!needsPoll) return;
    const timer = window.setInterval(() => {
      void loadPortfolio(id).catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [id, portfolio?.rows, busy, loadPortfolio]);

  return (
    <div className="min-h-screen bg-bg" data-testid="portfolio-page">
      <TopBar />
      <main className="mx-auto max-w-[1200px] min-w-0 overflow-x-hidden px-4 py-10 md:px-6 md:py-12">
        <header className="max-w-3xl border-b border-border/60 pb-8">
          <p className="text-label uppercase tracking-wide text-ink-3">Broker tools</p>
          <h1 className="mt-2 break-words font-display font-semibold text-display tracking-tight text-ink">
            Portfolio mode
          </h1>
          <p className="mt-3 break-words text-body leading-relaxed text-ink-2">
            Paste up to 10 storefronts or upload a CSV. We geocode, confirm ambiguous matches, then run shopper taste analyses in sequence.
          </p>
        </header>
        <div className="mt-10 grid min-w-0 gap-6 lg:grid-cols-12 lg:gap-8 lg:items-start">
          <div className="min-w-0 lg:col-span-5">
            {!portfolio && (
              <div className="rounded-[1.25rem] border border-border bg-surface-2 p-6 md:p-7">
                <label className="text-label uppercase text-ink-3" htmlFor="portfolio-addresses">
                  Addresses (one per line)
                </label>
                <textarea
                  id="portfolio-addresses"
                  className="mt-3 min-h-[168px] w-full rounded-control border border-border bg-surface px-3 py-3 text-body text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="1574 N Milwaukee Ave, Chicago, IL"
                  data-testid="portfolio-input"
                />
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Button type="button" onClick={() => void submitDraft()} disabled={busy}>
                    {busy ? 'Working…' : 'Geocode and analyze'}
                  </Button>
                  <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-body text-ink-2">
                    <Upload className="h-4 w-4" aria-hidden />
                    Upload CSV
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void onCsv(f);
                      }}
                    />
                  </label>
                </div>
                {error && (
                  <div className="mt-3" data-testid="portfolio-error">
                    <CalmErrorPanel
                      error={portfolioErrorInfo(error)}
                      onRetry={() => setError(null)}
                      testId="portfolio-error"
                    />
                  </div>
                )}
              </div>
            )}
            {portfolio && (
              <ErrorBoundary>
                <section className="min-w-0 rounded-[1.25rem] border border-border bg-surface-2 p-6 md:p-7" aria-label="Progress timeline">
                  <h2 className="text-label uppercase text-ink-3">Progress</h2>
                  <ol className="mt-4 min-w-0 space-y-2" data-testid="portfolio-timeline">
                    {portfolio.rows.map((row) => (
                      <li key={row.id} className="min-w-0 rounded-control border border-border bg-surface px-3 py-2.5 text-body">
                        <p className="break-words font-medium text-ink">{row.inputAddress}</p>
                        <p className="text-small text-ink-3">{statusLabel(row.status)}</p>
                        {row.status === 'ambiguous' && row.geocodeCandidates && (
                          <div className="mt-2 space-y-1">
                            {row.geocodeCandidates.map((c, i) => (
                              <button
                                key={c.resolvedAddress}
                                type="button"
                                className="block w-full break-words rounded-control border border-border bg-surface-2 px-2 py-1.5 text-left text-small hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                onClick={() => void confirmRow(row.id, i)}
                              >
                                {c.resolvedAddress}
                              </button>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {portfolio.rows.some((r) => r.status === 'ready') && (
                      <Button type="button" disabled={busy} onClick={() => void runPortfolio(portfolio.id)}>
                        Run analyses
                      </Button>
                    )}
                    <a
                      href={apiUrl(`/api/portfolio/${portfolio.id}/export.csv`)}
                      className={buttonClassName({ variant: 'secondary' })}
                    >
                      Export CSV
                    </a>
                  </div>
                </section>
              </ErrorBoundary>
            )}
          </div>
          <div className="min-w-0 lg:col-span-7">
            <ErrorBoundary>
              {portfolio ? (
                <div className="overflow-hidden overflow-x-auto rounded-[1.25rem] border border-border bg-surface">
                  <table className="w-full text-left text-body" data-testid="portfolio-table">
                    <thead className="border-b border-border/70 bg-surface-2/80 text-label uppercase text-ink-3">
                      <tr>
                        <th className="px-5 py-3.5 font-medium">
                          <button type="button" className="hover:text-ink" onClick={() => toggleSort('property')}>Property</button>
                        </th>
                        <th className="px-5 py-3.5 font-medium">
                          <button type="button" className="hover:text-ink" onClick={() => toggleSort('neighborhood')}>Neighborhood</button>
                        </th>
                        <th className="px-5 py-3.5 font-medium">Top prospects</th>
                        <th className="px-5 py-3.5 text-right font-medium">
                          <button type="button" className="hover:text-ink" onClick={() => toggleSort('hitRate')}>Backtest hit rate</button>
                        </th>
                        <th className="px-5 py-3.5 font-medium">
                          <button type="button" className="hover:text-ink" onClick={() => toggleSort('status')}>Status</button>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {sortedRows.map((row) => (
                        <tr key={row.id} className="bg-surface">
                          <td className="px-5 py-3.5 text-ink">
                            {row.location ? (
                              <Link
                                className="text-accent hover:underline"
                                to={buildReportPath({ address: row.location.address, radius: 10 })}
                              >
                                {row.inputAddress}
                              </Link>
                            ) : (
                              row.inputAddress
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-ink-2">{row.neighborhood ?? 'n/a'}</td>
                          <td className="px-5 py-3.5 text-ink-2">
                            {(row.topProspects ?? []).map((p) => p.name).join(', ') || 'n/a'}
                          </td>
                          <td className="px-5 py-3.5 text-right font-medium tabular-nums tracking-tight text-ink">
                            {row.backtestHitRate !== undefined ? row.backtestHitRate.toFixed(2) : 'n/a'}
                          </td>
                          <td className="px-5 py-3.5 text-ink-2">{statusLabel(row.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : loadingPortfolio ? (
                <PortfolioLoadingSkeleton />
              ) : (
                <div
                  className="flex min-h-[360px] items-center justify-center rounded-[1.25rem] border border-border bg-surface-2 lg:min-h-[420px]"
                  data-testid="portfolio-empty-state"
                >
                  <PageEmptyState icon={Building2} title="No portfolio run yet">
                    <p>{portfolioEmptyLine}</p>
                    <a
                      href="#portfolio-addresses"
                      className="mt-6 inline-block text-body font-medium text-accent hover:underline"
                    >
                      {portfolioEmptyAction}
                    </a>
                  </PageEmptyState>
                </div>
              )}
              {portfolio && (
                <p className="mt-4 text-meta text-ink-3">
                  Shareable link:{' '}
                  <span className="break-all font-mono text-small text-ink-2">{`/portfolio/${portfolio.id}`}</span>
                </p>
              )}
            </ErrorBoundary>
          </div>
        </div>
      </main>
    </div>
  );
}
