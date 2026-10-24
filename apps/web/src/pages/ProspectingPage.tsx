import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { TopBar } from '../components/layout/TopBar';
import { Button } from '../components/ui/Button';
import { AgentReceipt } from '../components/prospecting/AgentReceipt';
import { ProspectingTimeline } from '../components/prospecting/ProspectingTimeline';
import { useProspectingRun } from '../hooks/useProspectingRun';
import { apiUrl } from '../lib/api';
import { CalmErrorPanel } from '../components/ui/CalmErrorPanel';
import type { ApiErrorInfo } from '../lib/api-error';

export function ProspectingPage() {
  const { id } = useParams();
  const { job, loading, error, load, startRun } = useProspectingRun();
  const started = useRef(false);

  useEffect(() => {
    if (!id) return;
    void load(id).then((j) => {
      if (j.status === 'needs_geocode') return;
      if (j.status === 'complete') return;
      if (started.current) return;
      started.current = true;
      void startRun(id);
    });
  }, [id, load, startRun]);

  const confirmTopCandidate = async () => {
    if (!id || !job?.geocodeCandidates?.length) return;
    await fetch(apiUrl(`/api/prospecting/${id}/confirm`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateIndex: 0 }),
    });
    started.current = true;
    void startRun(id);
    void load(id);
  };

  return (
    <div className="min-h-screen bg-bg">
      <TopBar />
      <main className="mx-auto max-w-[720px] px-4 py-10" data-testid="prospecting-page">
        <h1 className="font-display font-semibold text-display text-ink">Full prospecting run</h1>
        <p className="mt-2 text-ink-2">
          Autonomous agent: geocode, taste, store scan, verification, outreach drafts, pitch pack.
        </p>

        {error && (
          <div className="mt-4" data-testid="prospecting-error">
            <CalmErrorPanel
              error={{ message: error, code: 'SERVER_BUSY' } satisfies ApiErrorInfo}
              onRetry={() => id && void startRun(id)}
              testId="prospecting-error"
            />
          </div>
        )}

        {!job && <p className="mt-8 text-ink-2">Loading job…</p>}

        {job?.status === 'needs_geocode' && (
          <div className="mt-6 rounded-card border border-border bg-surface p-4">
            <p className="text-sm text-ink-2">Multiple address matches. Confirm the top candidate to continue.</p>
            <p className="mt-2 text-sm font-medium text-ink">
              {job.geocodeCandidates?.[0]?.resolvedAddress}
            </p>
            <Button type="button" className="mt-4" onClick={() => void confirmTopCandidate()}>
              Confirm and run
            </Button>
          </div>
        )}

        {job && job.status !== 'needs_geocode' && (
          <div className="mt-8">
            <ProspectingTimeline job={job} loading={loading} />
          </div>
        )}

        {job?.status === 'complete' && <AgentReceipt job={job} />}

        {job?.pitchId && (
          <div className="mt-8 rounded-card border border-accent/30 bg-surface p-5">
            <p className="font-medium text-ink">Pitch pack ready</p>
            <Link to={`/pitch/${job.pitchId}`} className="mt-2 inline-block text-accent hover:underline">
              Open pitch pack
            </Link>
          </div>
        )}

        {job?.outreachDrafts && job.outreachDrafts.length > 0 && (
          <div className="mt-8 space-y-4">
            <h2 className="text-h3 font-semibold text-ink">Draft outreach (not sent)</h2>
            {job.outreachDrafts.map((d) => (
              <div key={d.entityId} className="rounded-card border border-border bg-surface p-4 text-sm">
                <p className="font-medium text-ink">{d.brandName}</p>
                <p className="mt-1 text-ink-3">{d.subject}</p>
                <p className="mt-2 whitespace-pre-wrap text-ink-2">{d.body}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
