import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { TopBar } from '../components/layout/TopBar';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { Select } from '../components/ui/Select';
import type { DemoFixtureId } from '../lib/demo-chip-addresses';
import {
  buildReportPath,
  categoryToTags,
  CATEGORY_OPTIONS,
  type CategoryKey,
} from '../lib/report-params';
import { startProspectingJob } from '../lib/start-prospecting';
import {
  LANDING_ADDRESS_PLACEHOLDER,
  LANDING_HEADLINE,
  LANDING_PLAIN_SUMMARY,
} from '../lib/broker-copy';
import { LANDING_DEMO_CHIPS } from '../data/landing-demo-chips';

const LandingHeroProductPreview = lazy(() =>
  import('../components/landing/LandingHeroProductPreview').then((m) => ({
    default: m.LandingHeroProductPreview,
  }))
);

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
        <section className="premium-hero-glow overflow-hidden border-b border-border bg-bg">
          <div className="mx-auto max-w-content px-4 pb-16 pt-[12vh] md:px-6 md:pb-20 md:pt-[14vh]">
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(300px,560px)] lg:items-center lg:gap-8 xl:grid-cols-[minmax(0,1fr)_600px] xl:gap-12">
              <div className="min-w-0">
            <div className="mx-auto max-w-[640px] text-center lg:mx-0 lg:text-left">
              <h1 className="font-display font-medium text-[clamp(1.75rem,4.5vw,2.5rem)] leading-[1.15] tracking-tight text-ink">
                {LANDING_HEADLINE}
              </h1>
              <p className="mt-5 text-body-lg text-ink-2" data-testid="landing-plain-summary">
                {LANDING_PLAIN_SUMMARY}
              </p>
            </div>

            <form
              className="frame-corner-ticks mx-auto mt-10 w-full max-w-[640px] rounded-card border border-border bg-surface p-4 md:p-5 lg:mx-0 lg:max-w-none"
              onSubmit={(e) => {
                e.preventDefault();
                submit(address);
              }}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-2">
                <div className="relative min-w-0 flex-1">
                  <MapPin
                    className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-3 sm:left-4"
                    aria-hidden
                  />
                  <Input
                    data-testid="landing-address-input"
                    className="w-full pl-11 sm:pl-12"
                    placeholder={LANDING_ADDRESS_PLACEHOLDER}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    aria-label={LANDING_ADDRESS_PLACEHOLDER}
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full shrink-0 sm:w-auto sm:min-w-[124px]"
                  data-testid="landing-analyze-button"
                >
                  Analyze
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-3">
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
                  className="min-w-[140px] flex-1 sm:flex-none sm:min-w-[160px]"
                />
                <button
                  type="button"
                  data-testid="landing-run-prospecting"
                  className="inline-flex min-h-11 items-center text-small font-medium text-accent-muted underline decoration-accent/70 underline-offset-2 transition-colors hover:text-accent hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface rounded-control"
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
                </button>
              </div>
            </form>

            <div className="mx-auto mt-8 flex max-w-[640px] flex-wrap gap-2 lg:mx-0">
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
                  className="inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-pill border border-border bg-surface px-4 text-small font-medium text-ink transition-colors hover:border-border-strong hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <div className="mx-auto mt-8 max-w-[640px] text-center text-meta lg:mx-0 lg:text-left">
              <p className="text-ink-3">Need the reverse question?</p>
              <Link
                to="/brand"
                className="mt-1 inline-flex min-h-11 items-center font-medium text-ink underline decoration-accent underline-offset-2 hover:decoration-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-control"
              >
                Find sites for a brand
              </Link>
            </div>
              </div>

              <div className="mt-12 min-w-0 lg:mt-4 lg:pt-2">
                <Suspense fallback={null}>
                  <LandingHeroProductPreview />
                </Suspense>
              </div>
            </div>
          </div>
        </section>

        <Suspense fallback={null}>
          <LandingBelowFold />
        </Suspense>
      </main>
    </div>
  );
}
