import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { TopBar } from '../components/layout/TopBar';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { lazy, Suspense } from 'react';

const BrandReverseMap = lazy(() =>
  import('../components/brand/BrandReverseMap').then((m) => ({ default: m.BrandReverseMap }))
);
import { useBrandReverse, useBrandSearch, useMetros } from '../hooks/useBrandReverse';
import { displayBrandName } from '../lib/brand-display';

export function BrandPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [metroId, setMetroId] = useState('chicago');
  const { data: metros } = useMetros();
  const { data: brands, isLoading: brandsLoading } = useBrandSearch(search);
  const { data, isLoading, error, isFetching } = useBrandReverse(id, metroId);

  const metroOptions = useMemo(
    () => (metros ?? []).map((m) => ({ value: m.id, label: m.label })),
    [metros]
  );

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
                    onClick={() => navigate(`/brand/${b.entityId}`)}
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

  return (
    <div className="min-h-screen bg-bg" data-testid="brand-reverse-page">
      <TopBar />
      <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Link to="/brand" className="text-sm text-accent hover:underline">
              Change brand
            </Link>
            <h1 className="mt-3 font-serif text-h2 text-ink">
              {data ? displayBrandName(data.brand.entityId, data.brand.displayName) : 'Brand sites'}
            </h1>
            <p className="mt-2 text-sm text-ink-2">
              High-affinity cells with no nearby store in ATP data. Open any row as a full site report.
            </p>
            <div className="mt-6">
              <Select
                label="Metro"
                value={metroId}
                onChange={setMetroId}
                options={metroOptions.length ? metroOptions : [{ value: 'chicago', label: 'Chicago' }]}
              />
            </div>
            {data?.sourceNote && (
              <p className="mt-4 rounded-control border border-border bg-surface-2 px-3 py-2 text-sm text-ink-2">
                {data.sourceNote}
              </p>
            )}
            {error && (
              <p className="mt-4 text-sm text-red-600" role="alert">
                {(error as Error).message}
              </p>
            )}
            <ErrorBoundary>
              <section className="mt-6" aria-label="Top opportunities">
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
                        <Card className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-ink">{row.neighborhood ?? 'Area'}</p>
                              <p className="font-mono text-sm tabular-nums text-ink-3">
                                Affinity rank {row.affinityRank}
                                {row.nearestStoreKm !== undefined
                                  ? ` · ${row.nearestStoreKm} km to nearest store`
                                  : ''}
                              </p>
                            </div>
                            <Link to={row.reportPath}>
                              <Button type="button" size="sm" variant="secondary">
                                Open as site report
                              </Button>
                            </Link>
                          </div>
                        </Card>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </ErrorBoundary>
          </div>
          <div className="lg:col-span-8">
            <ErrorBoundary>
              <Card className="overflow-hidden p-0">
                {isLoading ? (
                  <Skeleton className="min-h-[420px] w-full" />
                ) : data ? (
                  <Suspense fallback={<Skeleton className="min-h-[420px] w-full" />}>
                    <BrandReverseMap data={data} />
                  </Suspense>
                ) : (
                  <div className="flex min-h-[420px] items-center justify-center p-8 text-sm text-ink-2">
                    Pick a metro to load the heatmap.
                  </div>
                )}
              </Card>
            </ErrorBoundary>
            {data && (
              <p className="mt-3 text-meta text-ink-3">
                Source: {data.source === 'heatmap' ? 'Qloo heatmap' : 'Qloo grid insights'} ·{' '}
                {data.stores.length} stores in metro
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
