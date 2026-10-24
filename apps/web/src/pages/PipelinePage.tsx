import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { KanbanSquare } from 'lucide-react';
import type { PipelineBoard, PipelinePublicBoard } from '@leaseup/contracts';
import { TopBar } from '../components/layout/TopBar';
import { Button } from '../components/ui/Button';
import { PageEmptyState } from '../components/ui/PageEmptyState';
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

  const emptyPipeline = board && board.cards.length === 0;

  return (
    <div className="min-h-screen bg-bg" data-testid="pipeline-page">
      <TopBar />
      <main id="main-content" className="mx-auto max-w-[1080px] px-4 py-10 md:px-6 md:py-12 outline-none">
        <header className="flex flex-wrap items-end justify-between gap-6 border-b border-border/60 pb-8">
          <div className="min-w-0 max-w-2xl">
            <p className="text-label uppercase tracking-wide text-ink-3">Leasing</p>
            <h1 className="mt-2 font-display font-semibold text-display tracking-tight text-ink">Pipeline</h1>
            <p className="mt-3 max-w-prose text-body leading-relaxed text-ink-2">
              {readOnly
                ? 'Shared view only. Outreach drafts and contact details stay off this link.'
                : 'Track brands you save from site reports. Set status, notes, and reminders yourself. LeaseUp does not send email for you.'}
            </p>
          </div>
          {!readOnly && board && board.cards.length > 0 && (
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
        </header>

        {readOnly && (
          <p className="mt-6 rounded-[1rem] bg-surface-2 px-4 py-3 text-body text-ink-2 ring-1 ring-border/50">
            Cards on this link only. Outreach drafts are not included.
          </p>
        )}

        {error && (
          <div
            className="mx-auto mt-10 max-w-md rounded-[1.25rem] bg-surface px-6 py-6 text-center ring-1 ring-border/60"
            data-testid="pipeline-error"
            role="alert"
          >
            <p className="font-medium text-ink">Pipeline unavailable</p>
            <p className="mt-2 text-body text-ink-2">{error}</p>
            <p className="mt-2 text-small text-ink-3">Open a report and use Add to pipeline, or start a new search.</p>
            <Link to="/" className="mt-4 inline-block text-accent hover:underline">Back to home</Link>
          </div>
        )}

        {!error && !board && <PipelineLoadingSkeleton />}

        {board && !error && (
          <>
            <div className="mt-10">
              {emptyPipeline ? (
                <div className="overflow-hidden rounded-[1.25rem] bg-surface-2 ring-1 ring-border/60">
                  <PageEmptyState icon={KanbanSquare} title="Nothing in your pipeline yet" testId="pipeline-empty">
                    <p>{pipelineEmptyLine}</p>
                    <Link to="/" className="mt-6 inline-block">
                      <Button type="button" variant="primary" size="md">{pipelineEmptyAction}</Button>
                    </Link>
                  </PageEmptyState>
                  {!readOnly && (
                    <div className="border-t border-border/60 bg-surface/80">
                      <OwnerUpdatePanel embedded />
                    </div>
                  )}
                </div>
              ) : (
                <PipelineKanban
                  cards={board.cards}
                  readOnly={readOnly}
                  onBoardUpdated={() => void reload()}
                />
              )}
            </div>
            {!readOnly && !emptyPipeline && (
              <div className="mt-12">
                <OwnerUpdatePanel />
              </div>
            )}
          </>
        )}

        {!readOnly && sharePath && board && board.cards.length > 0 && (
          <p className="mt-8 text-meta text-ink-3">
            View link: <span className="font-mono text-small text-ink-2">{sharePath}</span>
          </p>
        )}
      </main>
    </div>
  );
}
