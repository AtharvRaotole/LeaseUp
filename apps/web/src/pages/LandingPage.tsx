import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { TopBar } from '../components/layout/TopBar';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
const LandingProductVisual = lazy(() =>
  import('../components/landing/LandingProductVisual').then((m) => ({
    default: m.LandingProductVisual,
  }))
);
const LandingBelowFold = lazy(() =>
  import('../components/landing/LandingBelowFold').then((m) => ({ default: m.LandingBelowFold }))
);
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { Select } from '../components/ui/Select';
import type { DemoFixtureId } from '@leaseup/fixtures';
import {
  buildReportPath,
  categoryToTags,
  CATEGORY_OPTIONS,
  type CategoryKey,
} from '../lib/report-params';
import { startProspectingJob } from '../lib/start-prospecting';
import { LANDING_PLAIN_SUMMARY } from '../lib/broker-copy';
import { ProductExplainer } from '../components/report/ProductExplainer';

export function LandingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const demo = searchParams.get('demo');
    if (demo === 'wicker' || demo === 'boulder' || demo === 'sevierville') {
      void import('@leaseup/fixtures').then(({ DEMO_CHIP_ADDRESSES }) => {
        navigate(
          buildReportPath({ address: DEMO_CHIP_ADDRESSES[demo], radius: 10 }, demo),
          { replace: true }
        );
      });
    }
  }, [searchParams, navigate]);
  const [address, setAddress] = useState('');
  const [radiusKm, setRadiusKm] = useState<'2' | '5' | '10'>('10');
  const [category, setCategory] = useState<CategoryKey>('all');
  const [demoExamples, setDemoExamples] = useState<
    Array<{
      id: DemoFixtureId;
      neighborhood: string;
      city: string;
      hitRateLabel: string;
      address: string;
    }>
  >([]);

  useEffect(() => {
    void import('../data/demo-examples').then((m) => setDemoExamples(m.DEMO_EXAMPLES));
  }, []);

  const submit = (addr: string) => {
    const trimmed = addr.trim();
    if (!trimmed) return;
    navigate(
      buildReportPath({
        address: trimmed,
        radius: Number(radiusKm),
        categoryTags: categoryToTags(category),
      })
    );
  };

  return (
    <div className="min-h-screen bg-bg bg-[radial-gradient(ellipse_at_top,_var(--surface-2)_0%,_var(--bg)_55%)]">
      <TopBar />
      <main id="main-content" className="outline-none">
      <div className="mx-auto max-w-[720px] px-4 pb-24 pt-[18vh]">
        <div className="text-center">
          <p className="inline-flex rounded-pill border border-border bg-surface px-3 py-1 text-label uppercase text-ink-3">
            Built on Qloo taste data
          </p>
          <h1 className="mt-6 font-serif text-display text-ink">
            Find the tenants your space is missing.
          </h1>
          <p className="mt-4 text-lg text-ink-2" data-testid="landing-plain-summary">
            {LANDING_PLAIN_SUMMARY}
          </p>
          <ProductExplainer className="mt-3 text-base text-ink-2" testId="landing-product-explainer" />
        </div>

        <form
          className="mt-10 rounded-card border border-border bg-surface p-5 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            submit(address);
          }}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <div className="relative flex-1">
              <MapPin className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-3" aria-hidden />
              <Input
                className="pl-12"
                placeholder="Storefront address, e.g. 1574 N Milwaukee Ave, Chicago"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                aria-label="Storefront address"
              />
            </div>
            <Button type="submit" size="lg" className="sm:min-w-[120px]">
              Analyze
            </Button>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              data-testid="landing-run-prospecting"
              onClick={() => {
                const trimmed = address.trim();
                if (!trimmed) return;
                void startProspectingJob({
                  address: trimmed,
                  radius: Number(radiusKm),
                  categoryTags: categoryToTags(category),
                }).then((id) => navigate(`/prospect/${id}`));
              }}
            >
              Run full prospecting
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-4">
            <SegmentedControl
              label="Trade area"
              value={radiusKm}
              onChange={(v) => setRadiusKm(v as '2' | '5' | '10')}
              options={[
                { value: '2', label: '2 km area' },
                { value: '5', label: '5 km area' },
                { value: '10', label: '10 km area' },
              ]}
            />
            <Select
              label="Category"
              value={category}
              onChange={(v) => setCategory(v as CategoryKey)}
              options={CATEGORY_OPTIONS.map((c) => ({ value: c.key, label: c.label }))}
              className="min-w-[180px]"
            />
          </div>
        </form>

        <Card className="mt-8 flex flex-col gap-3 border-dashed p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-left">
            <p className="font-medium text-ink">Find sites for a brand</p>
            <p className="text-sm text-ink-2">Flip the question: where should this chain open next?</p>
          </div>
          <Link to="/brand">
            <Button type="button" variant="secondary" className="w-full sm:w-auto">
              Brand reverse mode
            </Button>
          </Link>
        </Card>

        <div className="mt-10">
          <p className="text-label uppercase text-ink-3 mb-3">Try an example</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {demoExamples.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() =>
                  navigate(
                    buildReportPath(
                      {
                        address: ex.address,
                        radius: Number(radiusKm),
                        categoryTags: categoryToTags(category),
                      },
                      ex.id
                    )
                  )
                }
                className="text-left rounded-card border border-border bg-surface p-4 transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <p className="font-medium text-ink">{ex.neighborhood}</p>
                <p className="text-sm text-ink-2">{ex.city}</p>
                <p className="mt-3 font-mono text-sm tabular-nums text-accent">{ex.hitRateLabel}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        <LandingProductVisual />
        <LandingBelowFold />
      </Suspense>
      </main>
    </div>
  );
}
