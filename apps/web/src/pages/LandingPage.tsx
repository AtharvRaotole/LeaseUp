import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { TopBar } from '../components/layout/TopBar';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
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
import { LANDING_HEADLINE, LANDING_PLAIN_SUMMARY } from '../lib/broker-copy';
import { LANDING_DEMO_CHIPS } from '../data/landing-demo-chips';

const LandingBelowFold = lazy(() =>
  import('../components/landing/LandingBelowFold').then((m) => ({ default: m.LandingBelowFold }))
);

export function LandingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const prefill = searchParams.get('address');
    if (prefill?.trim()) {
      setAddress(prefill.trim());
    }
  }, [searchParams]);

  useEffect(() => {
    const demo = searchParams.get('demo');
    if (demo === 'wicker' || demo === 'boulder' || demo === 'sevierville') {
      void import('@leaseup/fixtures').then(({ DEMO_CHIP_ADDRESSES }) => {
        navigate(
          buildReportPath({ address: DEMO_CHIP_ADDRESSES[demo as DemoFixtureId], radius: 10 }, demo),
          { replace: true }
        );
      });
    }
  }, [searchParams, navigate]);

  const [address, setAddress] = useState('');
  const [radiusKm, setRadiusKm] = useState<'2' | '5' | '10'>('10');
  const [category, setCategory] = useState<CategoryKey>('all');

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
    <div className="min-h-screen bg-bg">
      <TopBar />
      <main id="main-content" className="outline-none">
        <section className="relative overflow-hidden border-b border-border bg-[radial-gradient(ellipse_at_top,_var(--surface-2)_0%,_var(--bg)_58%)]">
          <div className="mx-auto max-w-[880px] px-4 pb-16 pt-[14vh] md:px-6 md:pb-20 md:pt-[16vh]">
            <div className="mx-auto max-w-[640px] text-center">
              <h1 className="font-display font-semibold text-[clamp(2rem,5vw,3.25rem)] leading-[1.12] tracking-tight text-ink">
                {LANDING_HEADLINE}
              </h1>
              <p className="mt-5 text-body-lg text-ink-2" data-testid="landing-plain-summary">
                {LANDING_PLAIN_SUMMARY}
              </p>
            </div>

            <form
              className="mx-auto mt-10 max-w-[640px] rounded-card border border-border bg-surface p-5 shadow-sm md:p-6"
              onSubmit={(e) => {
                e.preventDefault();
                submit(address);
              }}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                <div className="relative flex-1">
                  <MapPin
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-3"
                    aria-hidden
                  />
                  <Input
                    className="pl-12"
                    placeholder="Storefront address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    aria-label="Storefront address"
                  />
                </div>
                <Button type="submit" size="lg" className="sm:min-w-[128px]">
                  Analyze
                </Button>
              </div>
              <div className="mt-4 flex flex-wrap items-end gap-4">
                <SegmentedControl
                  label="Trade area"
                  value={radiusKm}
                  onChange={(v) => setRadiusKm(v as '2' | '5' | '10')}
                  options={[
                    { value: '2', label: '2 km' },
                    { value: '5', label: '5 km' },
                    { value: '10', label: '10 km' },
                  ]}
                />
                <Select
                  label="Category"
                  value={category}
                  onChange={(v) => setCategory(v as CategoryKey)}
                  options={CATEGORY_OPTIONS.map((c) => ({ value: c.key, label: c.label }))}
                  className="min-w-[160px]"
                />
              </div>
              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
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
            </form>

            <div className="mx-auto mt-8 flex max-w-[640px] flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
              {LANDING_DEMO_CHIPS.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  data-testid={`landing-demo-chip-${chip.id}`}
                  onClick={() =>
                    navigate(
                      buildReportPath(
                        {
                          address: chip.address,
                          radius: Number(radiusKm),
                          categoryTags: categoryToTags(category),
                        },
                        chip.id
                      )
                    )
                  }
                  className="inline-flex min-h-11 items-center justify-center rounded-pill border border-border bg-surface px-4 text-small font-medium text-ink transition-colors hover:border-border-strong hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <p className="mx-auto mt-8 max-w-[640px] text-center text-meta text-ink-3">
              Need the reverse question?{' '}
              <Link to="/brand" className="text-accent hover:underline">
                Find sites for a brand
              </Link>
            </p>
          </div>
        </section>

        <Suspense fallback={null}>
          <LandingBelowFold />
        </Suspense>
      </main>
    </div>
  );
}
