import {
  DEMO_CHIP_ADDRESSES,
  wickerLandingTasteSnippet,
  type LandingTasteRow,
} from '@leaseup/fixtures';
import { Link } from 'react-router-dom';
import { Logo } from '../brand/Logo';
import { Card } from '../ui/Card';
import { LANDING_PROOF_CHIPS } from '../../data/landing-proof';
import {
  PinStepIllustration,
  TasteReadIllustration,
  VerifiedListIllustration,
} from './StepIllustrations';

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

function formatAffinity(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function storeLabel(row: LandingTasteRow): string {
  if (!row.storeInRadius) return 'No ATP store in 10 km';
  if (row.nearestStoreKm === null) return 'Store in radius';
  return `Nearest store ${row.nearestStoreKm.toFixed(1)} km`;
}

const tasteRows = wickerLandingTasteSnippet();

export function LandingBelowFold() {
  return (
    <>
      <section id="how-it-works" className="border-t border-border bg-surface-2 py-20">
        <div className="mx-auto max-w-[1040px] px-4">
          <p className="text-center text-label uppercase tracking-wide text-ink-3">How it works</p>
          <h2 className="mt-3 text-center font-serif text-h2 text-ink">
            From address to pitch list in three steps
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map((step) => (
              <Card key={step.n} className="flex flex-col bg-surface">
                <step.Illustration className="h-20 w-20 text-accent" />
                <p className="mt-6 font-mono text-sm text-ink-3">{step.n}</p>
                <h3 className="mt-2 text-h3 font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">{step.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="why-qloo" className="border-t border-border bg-bg py-20">
        <div className="mx-auto grid max-w-[1040px] gap-12 px-4 lg:grid-cols-2 lg:items-start">
          <div>
            <p className="text-label uppercase text-ink-3">Why Qloo</p>
            <h2 className="mt-3 font-serif text-h2 text-ink">
              Taste affinity beats generic demographics
            </h2>
            <p className="mt-4 text-ink-2 leading-relaxed">
              LeaseUp uses Qloo Taste AI to score how well a brand matches what people around your
              pin already spend time and money on. Brands that rank high are more likely to thrive
              if they open nearby. We still verify every name against real store locations before
              you pitch.
            </p>
            <p className="mt-4 text-sm text-ink-3">
              Example from the recorded Wicker Park demo fixture (10 km radius). Affinity values come
              straight from the saved Qloo response.
            </p>
          </div>
          <Card className="overflow-hidden bg-surface p-0">
            <div className="border-b border-border bg-surface-2 px-4 py-3">
              <p className="font-mono text-xs text-ink-3">Wicker Park, Chicago</p>
              <p className="text-sm text-ink-2 truncate">{DEMO_CHIP_ADDRESSES.wicker}</p>
            </div>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-label uppercase text-ink-3">
                  <th className="px-4 py-2 font-medium">#</th>
                  <th className="px-4 py-2 font-medium">Brand</th>
                  <th className="px-4 py-2 font-medium">Affinity</th>
                  <th className="px-4 py-2 font-medium">Stores</th>
                </tr>
              </thead>
              <tbody>
                {tasteRows.map((row) => (
                  <tr key={row.rank} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono tabular-nums text-ink-3">{row.rank}</td>
                    <td className="px-4 py-3 font-medium text-ink">{row.brandName}</td>
                    <td className="px-4 py-3 font-mono tabular-nums text-accent">
                      {formatAffinity(row.affinity)}
                    </td>
                    <td className="px-4 py-3 text-ink-2">{storeLabel(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </section>

      <section id="proof" className="border-t border-border bg-surface-2 py-16">
        <div className="mx-auto max-w-[1040px] px-4">
          <p className="text-center text-label uppercase text-ink-3">Proof</p>
          <h2 className="mt-3 text-center font-serif text-h2 text-ink">
            Backtest on our three demo pins
          </h2>
          <p className="mx-auto mt-3 max-w-[640px] text-center text-sm text-ink-2">
            For each recorded neighborhood we ask: of the top 10 Qloo-ranked brands we track in All
            The Places, how many already have a store within 10 km? Higher means the taste signal
            lines up with who is already on the ground.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {LANDING_PROOF_CHIPS.map((chip) => (
              <Card key={chip.id} className="bg-surface text-center">
                <p className="font-semibold text-ink">{chip.neighborhood}</p>
                <p className="text-sm text-ink-2">{chip.city}</p>
                <p className="mt-4 font-mono text-2xl tabular-nums text-accent">
                  {chip.presentInTop10}
                  <span className="text-base text-ink-3"> / 10</span>
                </p>
                <p className="mt-1 text-xs text-ink-3">{chip.hitRateLabel}</p>
              </Card>
            ))}
          </div>
          <ul className="mx-auto mt-10 max-w-[720px] space-y-2 text-center text-sm text-ink-2">
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
        </div>
      </section>

      <section id="who-its-for" className="border-t border-border bg-bg py-16">
        <div className="mx-auto max-w-[720px] px-4 text-center">
          <p className="text-label uppercase text-ink-3">Who it is for</p>
          <h2 className="mt-3 font-serif text-h2 text-ink">Built for people who fill storefronts</h2>
          <ul className="mt-8 space-y-4 text-left text-ink-2">
            <li>
              <span className="font-medium text-ink">Independent landlords</span> with one vacant bay
              who want a short list of credible tenants.
            </li>
            <li>
              <span className="font-medium text-ink">Leasing brokers</span> who need evidence before
              they cold-call a brand rep.
            </li>
            <li>
              <span className="font-medium text-ink">Small REITs</span> standardizing prospecting
              across a handful of markets.
            </li>
          </ul>
        </div>
      </section>

      <footer className="border-t border-border bg-surface-2 py-10">
        <div className="mx-auto flex max-w-[1040px] flex-col items-center gap-4 px-4 text-center text-meta text-ink-3">
          <Logo variant="lockup" size="xs" className="justify-center opacity-80" />
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            <a
              href="https://github.com/AtharvRaotole/LeaseUp"
              className="text-ink-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-control px-1"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            <a
              href="https://github.com/AtharvRaotole/LeaseUp/blob/main/LICENSE"
              className="text-ink-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-control px-1"
              target="_blank"
              rel="noreferrer"
            >
              MIT License
            </a>
            <Link
              to="/"
              className="text-ink-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-control px-1"
            >
              LeaseUp home
            </Link>
          </nav>
          <p className="max-w-[640px] text-xs leading-relaxed">
            Qloo Agentic Hackathon 2026. Map data © OpenStreetMap contributors (ODbL). Store
            locations from All The Places (CC0). Qloo Taste AI used under hackathon API terms.
          </p>
        </div>
      </footer>
    </>
  );
}
