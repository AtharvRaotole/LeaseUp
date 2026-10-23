import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import { TopBar } from '../components/layout/TopBar';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useBrandReverse, useBrandSearch, useMetros } from '../hooks/useBrandReverse';
import { displayBrandName } from '../lib/brand-display';
import { formatMetroMatchLabel } from '../lib/affinity-label';
import { cn } from '../lib/cn';

const BrandReverseMap = lazy(() =>
  import('../components/brand/BrandReverseMap').then((m) => ({ default: m.BrandReverseMap }))
);

const DEFAULT_METRO = 'chicago';
const DEMO_BRAND_ID = '54617D9D-5EC7-45E0-8B7F-360DADB0FE7E';

function formatRecordedAt(iso?: string): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return null;
  }
}

export function BrandPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const metroId = searchParams.get('metro') || DEFAULT_METRO;
  const [search, setSearch] = useState('');
  const [hoverRank, setHoverRank] = useState<number | null>(null);
  const { data: metros } = useMetros();
  const { data: brands, isLoading: brandsLoading } = useBrandSearch(search);
  const { data, isLoading, error, isFetching } = useBrandReverse(id, metroId);

  const metroOptions = useMemo(
    () => (metros ?? []).map((m) => ({ value: m.id, label: m.label })),
    [metros]
  );

  const setMetroId = (next: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('metro', next);
    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    if (!id && searchParams.get('metro')) return;
    if (id && !searchParams.get('metro')) {
      const params = new URLSearchParams(searchParams);
      params.set('metro', DEFAULT_METRO);
      setSearchParams(params, { replace: true });
    }
  }, [id, searchParams, setSearchParams]);

  if (!id) {
    return (
      <div className="min-h-screen bg-bg">
        <TopBar />
        <main className="mx-auto max-w-[1280px] px-4 py-12 md:px-6">
          <div className="mx-auto max-w-[720px] text-center">
            <h1 className="font-serif text-display text-ink">Find sites for a brand</h1>
            <p className="mt-4 text-lg text-ink-2">
              Pick one of 227 tracked chains. Qloo heatmaps show where taste is strongest, layered on existing stores.
            </p>
          </div>
          <Card className="mx-auto mt-10 max-w-[720px] p-5">
            <label className="text-label uppercase text-ink-3" htmlFor="brand-search">
              Search brands
            </label>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-3" aria-hidden />
              <Input
                id="brand-search"
                className="pl-12"
                placeholder="Start typing, e.g. Bath & Body Works"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="brand-search"
              />
            </div>
            <ul className="mt-4 max-h-[360px] overflow-y-auto divide-y divide-border" role="listbox">
              {brandsLoading && (
                <li className="py-3">
                  <Skeleton className="h-10 w-full" />
                </li>
              )}
              {(brands ?? []).slice(0, 40).map((b) => (
                <li key={b.entityId}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between py-3 text-left hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    onClick={() => navigate(`/brand/${b.entityId}?metro=${DEFAULT_METRO}`)}
                  >
                    <span className="font-medium text-ink">{displayBrandName(b.entityId, b.displayName)}</span>
                    <span className="text-meta text-ink-3">Select</span>
                  </button>
                </li>
              ))}
              {!brandsLoading && (brands ?? []).length === 0 && (
                <li className="py-6 text-center text-sm text-ink-2">No brands match that search.</li>
              )}
            </ul>
          </Card>
        </main>
      </div>
    );
  }

  const headlineTakeaway =
    data &&
    `${data.opportunities.length} strong gap${data.opportunities.length === 1 ? '' : 's'} in ${data.metro.label}, ${data.stores.length} stores today`;

  const recordedLabel = formatRecordedAt(data?.recordedAt);

  return (
    <div className="min-h-screen bg-bg" data-testid="brand-reverse-page">
      <TopBar />
      <main className="mx-auto max-w-[1280px] px-4 py-6 md:px-6">
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="flex flex-col lg:col-span-5 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto lg:pr-1">
            <Link to="/brand" className="text-sm text-accent hover:underline">
              Change brand
            </Link>
            <h1 className="mt-2 font-serif text-h2 text-ink">
              {data ? displayBrandName(data.brand.entityId, data.brand.displayName) : 'Brand sites'}
            </h1>
            {headlineTakeaway && (
              <p className="mt-1 text-base text-ink-2">{headlineTakeaway}</p>
            )}
            <div className="mt-5">
              <Select
                label="Metro"
                value={metroId}
                onChange={setMetroId}
                options={metroOptions.length ? metroOptions : [{ value: 'chicago', label: 'Chicago' }]}
              />
            </div>
            {data?.sourceNote && (
              <p className="mt-3 text-sm text-ink-3">{data.sourceNote}</p>
            )}
            {error && (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {(error as Error).message}
              </p>
            )}
            <ErrorBoundary>
              <section className="mt-6 flex-1" aria-label="Top opportunities">
                <h2 className="text-label uppercase text-ink-3">Top opportunities</h2>
                {isLoading || isFetching ? (
                  <div className="mt-3 space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : data && data.opportunities.length === 0 ? (
                  <p className="mt-3 text-sm text-ink-2">
                    No open cells met the gap rule for this brand in this metro. Try another metro or check store coverage.
                  </p>
                ) : (
                  <ol className="mt-3 space-y-2" data-testid="brand-opportunities">
                    {data?.opportunities.map((row) => (
                      <li key={`${row.latitude},${row.longitude}`}>
                        <Card
                          className={cn(
                            'p-4 transition-colors',
                            hoverRank === row.rank && 'border-accent ring-1 ring-accent/30'
                          )}
                          onMouseEnter={() => setHoverRank(row.rank)}
                          onMouseLeave={() => setHoverRank(null)}
                        >
                          <div className="flex gap-3">
                            <span
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white"
                              aria-hidden
                            >
                              {row.rank}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-ink">
                                {row.neighborhood ?? 'Loading area name'}
                              </p>
                              <p className="mt-1 text-sm text-ink-2">
                                {formatMetroMatchLabel(
                                  row.metroAreaRank,
                                  row.metroAreaCount,
                                  row.affinityRank
                                )}
                                {row.nearestStoreKm !== undefined
                                  ? ` · ${row.nearestStoreKm} km from nearest store`
                                  : ''}
                              </p>
                              <Link
                                to={row.reportPath}
                                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
                              >
                                Site report
                                <ArrowRight className="h-4 w-4" aria-hidden />
                              </Link>
                            </div>
                          </div>
                        </Card>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </ErrorBoundary>
          </div>

          <div className="lg:col-span-7 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)]">
            <ErrorBoundary>
              <Card className="flex h-full flex-col overflow-hidden p-0">
                {isLoading ? (
                  <Skeleton className="min-h-[360px] flex-1 w-full" />
                ) : data ? (
                  <Suspense fallback={<Skeleton className="min-h-[360px] flex-1 w-full" />}>
                    <div className="flex-1 min-h-0">
                      <BrandReverseMap
                        data={data}
                        highlightRank={hoverRank}
                        onHoverRank={setHoverRank}
                      />
                    </div>
                  </Suspense>
                ) : (
                  <div className="flex flex-1 items-center justify-center p-8 text-sm text-ink-2">
                    Pick a metro to load the heatmap.
                  </div>
                )}
                {data && (
                  <p className="border-t border-border px-4 py-3 text-meta text-ink-3">
                    Source: {data.source === 'heatmap' ? 'Qloo heatmap' : 'Qloo grid insights'}
                    {recordedLabel ? ` · Recorded ${recordedLabel}` : ''}
                    {' · '}
                    {data.stores.length} ATP stores in metro
                  </p>
                )}
              </Card>
            </ErrorBoundary>
          </div>
        </div>
      </main>
    </div>
  );
}

export { DEMO_BRAND_ID };
