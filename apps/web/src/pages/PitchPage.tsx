import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { PitchPackSnapshot, VacancyCalculatorInput } from '@leaseup/contracts';
import { Logo } from '../components/brand/Logo';
import { Button } from '../components/ui/Button';
import { VacancyCostCalculator } from '../components/report/VacancyCostCalculator';
import { apiUrl } from '../lib/api';
import { displayBrandName } from '../lib/brand-display';
import { verificationShortLabel } from '../lib/copy';
import { fitPercentileLabel } from '../lib/fit-display';
import { formatUserFacingDate } from '../lib/format-date';
import {
  pitchExecutiveSummaryLines,
  pitchProspectFact,
  shouldShowStoredWhyLine,
} from '../lib/pitch-pack-copy';
import { DEFAULT_VACANCY_INPUT } from '../lib/vacancy-cost';
import { AddToPipelineButton } from '../components/pipeline/AddToPipelineButton';
import { pipelineCardFromPitchProspect } from '../lib/build-pipeline-card';
import { ShareHead } from '../components/seo/ShareHead';
import { pitchShareHead } from '../lib/share-preview';

export function PitchPage() {
  const { id } = useParams();
  const [snapshot, setSnapshot] = useState<PitchPackSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vacancy, setVacancy] = useState<VacancyCalculatorInput>(DEFAULT_VACANCY_INPUT);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        const res = await fetch(apiUrl(`/api/pitch/${id}`));
        if (!res.ok) throw new Error('Pitch not found');
        const data = (await res.json()) as PitchPackSnapshot;
        setSnapshot(data);
        if (data.vacancy) setVacancy(data.vacancy);
      } catch {
        setError('This pitch link is missing or expired.');
      }
    })();
  }, [id]);

  const neighborhood = useMemo(() => {
    if (!snapshot) return '';
    return snapshot.neighborhood ?? snapshot.location.neighborhood ?? snapshot.location.city ?? 'Site';
  }, [snapshot]);

  const summaryLines = useMemo(
    () => (snapshot ? pitchExecutiveSummaryLines(snapshot) : []),
    [snapshot]
  );

  const shareHead = useMemo(() => {
    if (!snapshot) return null;
    const pathId = id ?? snapshot.id;
    return pitchShareHead(snapshot, `/p/${pathId}`);
  }, [snapshot, id]);

  if (error) {
    return (
      <div className="min-h-screen bg-bg px-4 py-24 text-center">
        <p className="text-ink-2">{error}</p>
        <Link to="/" className="mt-4 inline-block text-accent hover:underline">Back home</Link>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-bg px-4 py-24 text-center text-ink-2" data-testid="pitch-loading">
        Loading pitch…
      </div>
    );
  }

  const totalScored = snapshot.rankingsTotal ?? snapshot.prospects[0]?.prospect.brand.affinityRank ?? 1;

  return (
    <div className="min-h-screen bg-bg pitch-pack print-pitch-page" data-testid="pitch-page">
      {shareHead && <ShareHead {...shareHead} />}
      <header className="no-print border-b border-border bg-surface/90 px-4 py-4">
        <div className="mx-auto flex max-w-[880px] items-center justify-between gap-4">
          <Link to="/" className="text-ink" aria-label="LeaseUp home">
            <Logo variant="lockup" size="sm" />
          </Link>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}>
              Print / PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[880px] min-w-0 px-4 py-12 print:py-4">
        <section className="pitch-print-page-1">
          <p className="text-label uppercase tracking-wide text-ink-3">Tenant pitch pack</p>
          <h1 className="mt-3 break-words font-serif text-display text-ink">{neighborhood}</h1>
          <p className="mt-2 break-words text-lg text-ink-2">{snapshot.address}</p>
          <p className="mt-1 text-sm text-ink-3">
            Snapshot {formatUserFacingDate(snapshot.createdAt)} · {snapshot.radiusKm} km radius
          </p>

          <div className="mt-6 space-y-2 border-l-2 border-accent pl-4" data-testid="pitch-executive-summary">
            {summaryLines.map((line) => (
              <p key={line} className="text-ink">{line}</p>
            ))}
          </div>

          {(snapshot.landlord?.name || snapshot.landlord?.contact) && (
            <div className="mt-6 rounded-card border border-border bg-surface px-5 py-4 print:py-2">
              <p className="text-label uppercase text-ink-3">Prepared for</p>
              {snapshot.landlord?.name && <p className="mt-1 font-medium text-ink">{snapshot.landlord.name}</p>}
              {snapshot.landlord?.contact && <p className="text-sm text-ink-2">{snapshot.landlord.contact}</p>}
            </div>
          )}

          {snapshot.mapImage && (
            <figure className="pitch-map-frame mt-8 overflow-hidden rounded-card border-2 border-accent/40 bg-surface-2 print:mt-4">
              <img
                src={snapshot.mapImage}
                alt="Map of the site and nearby stores"
                className="pitch-map-image w-full object-cover"
              />
              <figcaption className="border-t border-border px-4 py-2 text-meta text-ink-3">
                Site pin and pitch brands (accent ramp)
              </figcaption>
            </figure>
          )}
        </section>

        <section className="pitch-print-page-2 mt-12 print:mt-0">
          <h2 className="font-serif text-2xl text-ink">Top brands to pitch</h2>
          <ol className="mt-4 space-y-5 print:space-y-1.5">
            {snapshot.prospects.map(({ prospect, whyLine }, index) => {
              const name = displayBrandName(prospect.brand.entityId, prospect.brand.name);
              const rankLabel = fitPercentileLabel(prospect.brand.affinityRank, totalScored);
              const fact = pitchProspectFact(prospect, snapshot.radiusKm);
              return (
                <li key={prospect.brand.entityId} className="pitch-prospect-block border-b border-border pb-5 last:border-0 print:pb-2">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-mono text-sm text-ink-3">#{index + 1}</span>
                    <h3 className="font-serif text-xl text-ink print:text-lg">{name}</h3>
                  </div>
                  <p className="mt-1 text-sm text-ink-2">
                    Qloo rank #{prospect.brand.affinityRank} ({rankLabel}) ·{' '}
                    {verificationShortLabel(prospect.brand.verified)}
                  </p>
                  <p className="mt-2 text-ink print:text-sm">{fact}</p>
                  {shouldShowStoredWhyLine(whyLine) && (
                    <p className="mt-1 text-sm text-ink-2 no-print">{whyLine}</p>
                  )}
                  <div className="mt-3 no-print">
                    <AddToPipelineButton
                      buildPayload={() =>
                        pipelineCardFromPitchProspect(
                          snapshot,
                          prospect,
                          `${window.location.origin}/pitch/${snapshot.id}`
                        )
                      }
                    />
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-8 print-pitch-block print:mt-2">
            <VacancyCostCalculator
              key={snapshot.id}
              className="pitch-vacancy"
              compact
              initial={snapshot.vacancy ?? vacancy}
              onChange={setVacancy}
            />
          </div>

          <footer className="mt-10 border-t border-border pt-6 text-sm text-ink-2 pitch-methodology print:mt-2 print:pt-2">
            <h2 className="font-serif text-lg text-ink">Methodology and data sources</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 print:text-xs">
              <li>Qloo Taste AI rankings ({snapshot.mode ?? 'demo'}) for affinity at this pin</li>
              <li>All The Places store locations (CC0)</li>
              <li>
                {snapshot.osmSnapshotLabel ?? 'OpenStreetMap'} for second source checks
                {snapshot.osmSnapshotRecordedAt
                  ? ` (${formatUserFacingDate(snapshot.osmSnapshotRecordedAt)})`
                  : ''}
              </li>
            </ul>
            <p className="mt-3 text-ink-3 print:text-xs">
              Vacancy cost figures are calculated from your inputs only and are not verified by LeaseUp.
            </p>
          </footer>
        </section>
      </main>
    </div>
  );
}
