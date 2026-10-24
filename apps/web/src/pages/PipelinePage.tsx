import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { PipelineBoard, PipelinePublicBoard } from '@leaseup/contracts';
import { TopBar } from '../components/layout/TopBar';
import { Button } from '../components/ui/Button';
import { PipelineKanban } from '../components/pipeline/PipelineKanban';
import { OwnerUpdatePanel } from '../components/pipeline/OwnerUpdatePanel';
import { fetchPipelineBoard, fetchPublicPipeline, pipelineExportUrl } from '../lib/pipeline-api';
import { PipelineLoadingSkeleton } from '../components/pipeline/PipelineLoadingSkeleton';
import { pipelineEmptyAction, pipelineEmptyLine, shareLinkExpiredLine } from '../lib/empty-state-copy';

export function PipelinePage() {
  const { shareId } = useParams();
  const readOnly = Boolean(shareId);
  const [board, setBoard] = useState<PipelineBoard | PipelinePublicBoard | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      if (shareId) {
        setBoard(await fetchPublicPipeline(shareId));
      } else {
        setBoard(await fetchPipelineBoard());
      }
      setError(null);
    } catch {
      setError(
        readOnly ? shareLinkExpiredLine : 'Could not load your pipeline. Refresh the page or try again.'
      );
    }
  }, [shareId, readOnly]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const sharePath =
    board && 'shareId' in board && board.shareId ? `/pipeline/view/${board.shareId}` : null;

  return (
    <div className="min-h-screen bg-bg" data-testid="pipeline-page">
      <TopBar />
      <main id="main-content" className="mx-auto max-w-[1280px] px-4 py-8 md:px-6 md:py-10 outline-none">
        <div className="flex flex-wrap items-start justify-between gap-4 md:items-end">
          <div className="min-w-0 max-w-2xl">
            <p className="text-label uppercase tracking-wide text-ink-3">Leasing</p>
            <h1 className="mt-1 font-display font-semibold text-display text-ink">Pipeline</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">
              {readOnly
                ? 'Shared view only. Outreach drafts and contact details stay off this link.'
                : 'Track brands you save from site reports. Set status, notes, and reminders yourself. LeaseUp does not send email for you.'}
            </p>
          </div>
          {!readOnly && board && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                data-testid="pipeline-export"
                onClick={() => {
                  void fetch(pipelineExportUrl(), { credentials: 'include' })
                    .then((r) => r.blob())
                    .then((blob) => {
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'leaseup-pipeline.csv';
                      a.click();
                      URL.revokeObjectURL(url);
                    });
                }}
              >
                Export CSV
              </Button>
              {sharePath && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const url = `${window.location.origin}${sharePath}`;
                    void navigator.clipboard.writeText(url);
                  }}
                  data-testid="pipeline-share"
                >
                  Copy view link
                </Button>
              )}
            </div>
          )}
        </div>

        {readOnly && (
          <p className="mt-4 rounded-card border border-border bg-surface-2 px-4 py-3 text-sm text-ink-2">
            Cards on this link only. Outreach drafts are not included.
          </p>
        )}

        {error && (
          <div
            className="mx-auto mt-8 max-w-md rounded-card border border-border bg-surface px-4 py-4 text-center text-sm"
            data-testid="pipeline-error"
            role="alert"
          >
            <p className="font-medium text-ink">Pipeline unavailable</p>
            <p className="mt-2 text-ink-2">{error}</p>
            <p className="mt-2 text-ink-3">Open a report and use Add to pipeline, or start a new search.</p>
            <Link to="/" className="mt-4 inline-block text-accent hover:underline">Back to home</Link>
          </div>
        )}

        {!error && !board && <PipelineLoadingSkeleton />}

        {board && !error && (
          <>
            <div className="mt-8">
              {board.cards.length === 0 ? (
                <div
                  className="rounded-card border border-dashed border-border bg-surface px-6 py-14 text-center md:px-10"
                  data-testid="pipeline-empty"
                >
                  <h2 className="font-display text-h3 font-semibold text-ink">Nothing in your pipeline yet</h2>
                  <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-2">
                    {pipelineEmptyLine}
                  </p>
                  <Link to="/" className="mt-6 inline-block">
                    <Button type="button" variant="primary" size="md">{pipelineEmptyAction}</Button>
                  </Link>
                </div>
              ) : (
                <PipelineKanban
                  cards={board.cards}
                  readOnly={readOnly}
                  onBoardUpdated={() => void reload()}
                />
              )}
            </div>
            {!readOnly && (
              <div className={board.cards.length > 0 ? 'mt-10 border-t border-border pt-10' : 'mt-8'}>
                <OwnerUpdatePanel />
              </div>
            )}
          </>
        )}

        {!readOnly && sharePath && board && board.cards.length > 0 && (
          <p className="mt-6 text-xs text-ink-3">
            View link: <span className="text-ink-2">{sharePath}</span>
          </p>
        )}
      </main>
    </div>
  );
}
