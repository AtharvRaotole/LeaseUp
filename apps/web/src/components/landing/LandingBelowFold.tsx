import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { LandingReveal } from './LandingReveal';
import { LandingSectionHeading } from './LandingSectionHeading';
import { AddressStepCrop, BrandsStepCrop, PitchStepCrop } from './LandingStepCrops';
import { LandingPageFooter } from './LandingPageFooter';
import { landingEvalProofParagraphs } from '../../lib/landing-eval-copy';

const STEPS = [
  {
    title: 'Enter an address',
    body: 'Drop in the vacant storefront. We geocode the pin and set your trade area.',
    Crop: AddressStepCrop,
  },
  {
    title: 'See brands shoppers want',
    body: 'We rank chains by local taste and cross-check real stores so you pitch gaps, not guesses.',
    Crop: BrandsStepCrop,
  },
  {
    title: 'Send a pitch',
    body: 'Share a frozen pitch pack with map, top brands, and optional vacancy math you control.',
    Crop: PitchStepCrop,
  },
] as const;

const FEATURES = [
  {
    title: 'Pitch pack',
    body: 'One link with today\'s rankings, map snapshot, and landlord-ready copy.',
    href: '/methodology',
  },
  {
    title: 'Pipeline',
    body: 'Save strong fits and track outreach without leaving the browser.',
    href: '/pipeline',
  },
  {
    title: 'Vacancy cost',
    body: 'Your inputs only: see what each extra vacant month costs on the report.',
    href: '/methodology',
  },
  {
    title: 'Portfolio',
    body: 'Paste multiple addresses and compare pitch lists across sites.',
    href: '/portfolio',
  },
] as const;

export function LandingBelowFold() {
  const proofLines = landingEvalProofParagraphs();

  return (
    <>
      <section id="how-it-works" className="border-t border-border bg-surface-2 py-16 md:py-20">
        <LandingReveal className="mx-auto max-w-[1080px] px-4 md:px-6">
          <LandingSectionHeading kicker="How it works" title="From address to outreach in three steps" />
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <Card key={step.title} className="flex h-full flex-col bg-surface">
                <p className="text-meta font-medium uppercase text-ink-3">Step {index + 1}</p>
                <h3 className="mt-2 font-display text-body-lg font-semibold text-ink md:text-h3">{step.title}</h3>
                <p className="mt-2 text-body text-ink-2">{step.body}</p>
                <div className="mt-5 flex-1">
                  <step.Crop />
                </div>
              </Card>
            ))}
          </div>
        </LandingReveal>
      </section>

      <section id="proof" className="border-t border-border bg-bg py-16 md:py-20">
        <LandingReveal className="mx-auto max-w-[720px] px-4 md:px-6 text-center">
          <LandingSectionHeading kicker="Proof" title="40-neighborhood backtest, recorded in the repo" />
          <div className="mt-8 space-y-4 text-left text-body text-ink-2">
            {proofLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <p className="mt-8">
            <Link
              to="/methodology"
              className="font-medium text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-control"
            >
              Read the full methodology
            </Link>
          </p>
        </LandingReveal>
      </section>

      <section id="built-for" className="border-t border-border bg-surface-2 py-16 md:py-20">
        <LandingReveal className="mx-auto max-w-[1080px] px-4 md:px-6">
          <LandingSectionHeading
            kicker="Product"
            title="Built for leasing brokers and landlords"
          />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <Card key={feature.title} className="flex h-full flex-col bg-surface">
                <h3 className="font-display text-body-lg font-semibold text-ink">{feature.title}</h3>
                <p className="mt-2 flex-1 text-body text-ink-2">{feature.body}</p>
                <Link
                  to={feature.href}
                  className="mt-4 text-small font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-control"
                >
                  Learn more
                </Link>
              </Card>
            ))}
          </div>
        </LandingReveal>
      </section>

      <LandingPageFooter />
    </>
  );
}
