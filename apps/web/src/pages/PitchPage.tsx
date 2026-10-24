import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { PitchPackSnapshot } from '@leaseup/contracts';
import { Logo } from '../components/brand/Logo';
import { Button } from '../components/ui/Button';
import { VacancyCostCalculator } from '../components/report/VacancyCostCalculator';
import { PitchPackBrief } from '../components/pitch/PitchPackBrief';
import { PitchPackLoadingSkeleton } from '../components/pitch/PitchPackLoadingSkeleton';
import { shareLinkExpiredLine } from '../lib/empty-state-copy';
import { apiUrl } from '../lib/api';
import { formatUserFacingDate } from '../lib/format-date';
import {
  EMPTY_VACANCY_DRAFT,
  pitchVacancyToDraft,
  type VacancyCalculatorDraft,
} from '../lib/vacancy-cost';
import { loadVacancyDraft, saveVacancyDraft } from '../lib/vacancy-cost-storage';
import { AddToPipelineButton } from '../components/pipeline/AddToPipelineButton';
import { pipelineCardFromPitchProspect } from '../lib/build-pipeline-card';
import { ShareHead } from '../components/seo/ShareHead';
import { pitchShareHead } from '../lib/share-preview';
import { pitchPackVerificationSummary } from '../lib/copy';

export function PitchPage() {
  const { id } = useParams();
  const [snapshot, setSnapshot] = useState<PitchPackSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vacancy, setVacancy] = useState<VacancyCalculatorDraft>(EMPTY_VACANCY_DRAFT);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        const res = await fetch(apiUrl(`/api/pitch/${id}`));
        if (!res.ok) throw new Error('Pitch not found');
        const data = (await res.json()) as PitchPackSnapshot;
        setSnapshot(data);
        if (data.vacancy) {
          setVacancy(pitchVacancyToDraft(data.vacancy));
        } else {
          setVacancy(loadVacancyDraft(data.address));
        }
      } catch {
        setError(shareLinkExpiredLine);
      }
    })();
  }, [id]);

  const shareHead = useMemo(() => {
    if (!snapshot) return null;
    const pathId = id ?? snapshot.id;
    return pitchShareHead(snapshot, `/p/${pathId}`);
  }, [snapshot, id]);

  if (error) {
    return (
      <div className="min-h-screen bg-bg px-4 py-24 text-center" data-testid="pitch-error">
        <h1 className="font-display font-semibold text-h2 text-ink">Pitch unavailable</h1>
        <p className="mt-3 max-w-md mx-auto text-ink-2">{error}</p>
        <p className="mt-2 text-sm text-ink-3">Ask the sender for a fresh link, or run a new site search.</p>
        <Link to="/" className="mt-6 inline-block">
          <Button size="lg">Back to home</Button>
        </Link>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-bg pitch-pack" data-testid="pitch-loading">
        <header className="border-b border-border bg-surface/90 px-4 py-4">
          <div className="mx-auto max-w-[880px]">
            <Logo variant="lockup" size="sm" />
          </div>
        </header>
        <PitchPackLoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pitch-pack print-pitch-page" data-testid="pitch-page">
      {shareHead && <ShareHead {...shareHead} />}
      <header className="no-print border-b border-border bg-surface/90 px-4 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[880px] items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex min-h-11 min-w-11 items-center text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-control"
            aria-label="LeaseUp home"
          >
            <Logo variant="lockup" size="sm" />
          </Link>
          <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}>
            Print / PDF
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-[880px] min-w-0 px-4 py-10 print:max-w-none print:px-0 print:py-0">
        <PitchPackBrief snapshot={snapshot} />

        <section className="no-print mt-10 space-y-4 border-t border-border pt-8">
          <h2 className="font-display font-semibold text-lg text-ink">Add to your pipeline</h2>
          <ul className="space-y-3">
            {snapshot.prospects.map(({ prospect }) => (
              <li key={prospect.brand.entityId}>
                <AddToPipelineButton
                  buildPayload={() =>
                    pipelineCardFromPitchProspect(
                      snapshot,
                      prospect,
                      `${window.location.origin}/pitch/${snapshot.id}`
                    )
                  }
                />
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-10 print-pitch-block print:mt-4">
          <VacancyCostCalculator
            key={snapshot.id}
            className="pitch-vacancy"
            compact
            readOnly={!!snapshot.vacancy}
            initial={snapshot.vacancy ? pitchVacancyToDraft(snapshot.vacancy) : vacancy}
            onChange={(next) => {
              setVacancy(next);
              if (!snapshot.vacancy) saveVacancyDraft(snapshot.address, next);
            }}
          />
        </div>

        <footer className="pitch-methodology mt-10 border-t border-border pt-6 text-sm text-ink-2 print:mt-4 print:pt-3">
          <h2 className="font-display font-semibold text-lg text-ink print:text-base">Data sources</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 print:text-xs">
            <li>Local shopper taste from Qloo ({snapshot.mode ?? 'demo'} mode) for this address</li>
            <li>{pitchPackVerificationSummary(snapshot)}</li>
            <li>All The Places store locations (CC0)</li>
            <li>
              {snapshot.osmSnapshotLabel ?? 'OpenStreetMap'} snapshot
              {snapshot.osmSnapshotRecordedAt
                ? ` (${formatUserFacingDate(snapshot.osmSnapshotRecordedAt)})`
                : ''}
            </li>
          </ul>
          <p className="mt-3 text-ink-3 print:text-xs">
            Vacancy cost figures come from your inputs only and are not verified by LeaseUp.
          </p>
        </footer>
      </main>
    </div>
  );
}
