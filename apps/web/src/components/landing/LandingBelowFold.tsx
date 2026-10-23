import { demoChipsRandomBaselineSummary, wickerSeviervilleRankContrast } from '@leaseup/fixtures';
import { SiteFooter } from '../layout/SiteFooter';
import { Card } from '../ui/Card';
import { LANDING_PROOF_CHIPS } from '../../data/landing-proof';
import {
  PinStepIllustration,
  TasteReadIllustration,
  VerifiedListIllustration,
} from './StepIllustrations';
import { LandingReveal } from './LandingReveal';
import { LandingSectionHeading } from './LandingSectionHeading';

const STEPS = [
  {
    n: '1',
    title: 'Drop a pin',
    body: 'Enter the vacant storefront. We geocode the site and set a search radius.',
    Illustration: PinStepIllustration,
  },
  {
    n: '2',
    title: 'Read local taste',
    body: 'Qloo ranks major retail brands by how well they fit what people nearby already love.',
    Illustration: TasteReadIllustration,
  },
  {
    n: '3',
    title: 'Verify on real stores',
    body: 'We cross-check the list against All The Places and OpenStreetMap so you pitch gaps, not guesses.',
    Illustration: VerifiedListIllustration,
  },
] as const;

const rankContrast = wickerSeviervilleRankContrast(5);
const randomBaseline = demoChipsRandomBaselineSummary();

const WHO_FOR = [
  {
    title: 'Independent landlords',
    job: 'Turn one empty bay into three names worth calling this week.',
  },
  {
    title: 'Leasing brokers',
    job: 'Walk into the pitch with Qloo ranks and store checks, not a generic trade-area PDF.',
  },
  {
    title: 'Small REITs',
    job: 'Use the same prospecting playbook across Chicago, Boulder, and outlet towns.',
  },
] as const;

export function LandingBelowFold() {
  return (
    <>
      <section id="how-it-works" className="border-t border-border bg-surface-2 py-14 md:py-16">
        <LandingReveal className="mx-auto max-w-[1040px] px-4">
          <LandingSectionHeading
            kicker="How it works"
            title="From address to pitch list in three steps"
          />
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((step) => (
              <Card key={step.n} className="flex flex-col bg-surface">
                <step.Illustration className="h-20 w-20 text-accent" />
                <p className="mt-5 text-sm text-ink-3">{step.n}</p>
                <h3 className="mt-2 text-h3 font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{step.body}</p>
              </Card>
            ))}
          </div>
        </LandingReveal>
      </section>

      <section id="why-qloo" className="border-t border-border bg-bg py-14 md:py-16">
        <LandingReveal className="mx-auto max-w-[1040px] px-4">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <LandingSectionHeading
                kicker="Why Qloo"
                title="Same brands, different neighborhoods, different answers"
                align="left"
              />
              <p className="mt-4 text-ink-2 leading-relaxed">
                National chain lists look the same everywhere. Qloo re-orders brands for each pin.
                The table uses recorded demo fixtures only: rank position among store brands we can
                verify in All The Places, not raw affinity scores.
              </p>
            </div>
            <Card className="overflow-hidden bg-surface p-0">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Qloo brand rank in Wicker Park vs Sevierville from recorded fixtures
                </caption>
                <thead>
                  <tr className="border-b border-border bg-surface-2 text-center text-label uppercase text-ink-3">
                    <th scope="col" className="px-3 py-2 text-left font-medium">Brand</th>
                    <th scope="col" className="px-3 py-2 font-medium">Wicker Park</th>
                    <th scope="col" className="px-3 py-2 font-medium">Sevierville</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                {rankContrast.map((row) => (
                  <tr key={row.brandName}>
                    <th scope="row" className="px-4 py-3 text-left font-medium text-ink">
                      {row.brandName}
                    </th>
                    <td className="px-4 py-3 tabular-nums text-right text-accent">
                      #{row.rankA}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-right text-ink-2">
                      #{row.rankB}
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </Card>
          </div>
        </LandingReveal>
      </section>

      <section id="proof" className="border-t border-border bg-surface-2 py-14 md:py-16">
        <LandingReveal className="mx-auto max-w-[1040px] px-4">
          <LandingSectionHeading kicker="Proof" title="Backtest on our three demo pins" />
          <p className="mx-auto mt-3 max-w-[640px] text-center text-sm text-ink-2">
            Wicker Park and Boulder are typical urban examples; Sevierville is below typical lift. For
            each recorded neighborhood we ask: of the top 10 Qloo-ranked brands we track in All The
            Places, how many already have a store within 10 km?
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {LANDING_PROOF_CHIPS.map((chip) => (
              <Card key={chip.id} className="bg-surface text-center">
                <p className="font-semibold text-ink">{chip.neighborhood}</p>
                <p className="text-sm text-ink-2">{chip.city}</p>
                <p className="mt-3 text-2xl tabular-nums text-accent">
                  {chip.presentInTop10}
                  <span className="text-base text-ink-3"> / 10</span>
                </p>
                <p className="mt-1 text-xs text-ink-3">{chip.hitRateLabel}</p>
              </Card>
            ))}
          </div>
          <p className="mx-auto mt-6 max-w-[720px] text-center text-xs leading-relaxed text-ink-3">
            Method: store-brand-filtered Qloo fixture order vs ATP presence inside 10 km (recorded Oct
            2026 chips). Random baseline: expected hits if you drew 10 brands uniformly from each
            fixture pool (mean{' '}
            {randomBaseline.meanExpectedRandom.toFixed(1)} present) vs Qloo top 10 (mean{' '}
            {randomBaseline.meanQlooTop10.toFixed(1)} present) across the three demos.
          </p>
          <ul className="mx-auto mt-8 max-w-[720px] space-y-2 text-center text-sm text-ink-2">
            <li>
              <strong className="font-medium text-ink">Qloo Taste AI</strong> for brand affinity at a
              geocoded point
            </li>
            <li>
              <strong className="font-medium text-ink">All The Places</strong> (CC0) for chain store
              coordinates
            </li>
            <li>
              <strong className="font-medium text-ink">OpenStreetMap</strong> (ODbL) for independent
              verification on demo recordings
            </li>
          </ul>
        </LandingReveal>
      </section>

      <section id="who-its-for" className="border-t border-border bg-bg py-14 md:py-16">
        <LandingReveal className="mx-auto max-w-[1040px] px-4">
          <LandingSectionHeading kicker="Who it is for" title="Built for people who fill storefronts" />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {WHO_FOR.map((card) => (
              <Card key={card.title} className="bg-surface">
                <h3 className="font-semibold text-ink">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{card.job}</p>
              </Card>
            ))}
          </div>
        </LandingReveal>
      </section>

      <SiteFooter />
    </>
  );
}
