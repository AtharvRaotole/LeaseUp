import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { PipelineBoard, PipelinePublicBoard } from '@leaseup/contracts';
import { TopBar } from '../components/layout/TopBar';
import { Button } from '../components/ui/Button';
import { PipelineKanban } from '../components/pipeline/PipelineKanban';
import { fetchPipelineBoard, fetchPublicPipeline, pipelineExportUrl } from '../lib/pipeline-api';

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
      setError(readOnly ? 'This pipeline link is missing or expired.' : 'Could not load your pipeline.');
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
      <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-label uppercase tracking-wide text-ink-3">Leasing</p>
            <h1 className="mt-1 font-serif text-display text-ink">Pipeline</h1>
            <p className="mt-2 max-w-xl text-sm text-ink-2">
              {readOnly
                ? 'Read-only view of a shared board. Outreach and contacts are not shown here.'
                : 'Track prospects from report to signed lease. Drag cards between stages or use arrow keys in a card.'}
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
          <p className="mt-4 rounded-card border border-border bg-surface-2 px-3 py-2 text-sm text-ink-2">
            Shared pipeline · cards only (no outreach drafts on this link)
          </p>
        )}

        {error && (
          <p className="mt-8 text-center text-ink-2">
            {error}
            <Link to="/" className="mt-2 block text-accent hover:underline">Back home</Link>
          </p>
        )}

        {!error && !board && (
          <p className="mt-12 text-center text-ink-2" data-testid="pipeline-loading">Loading pipeline…</p>
        )}

        {board && !error && (
          <div className="mt-8">
            {board.cards.length === 0 ? (
              <div
                className="rounded-card border border-dashed border-border bg-surface px-6 py-16 text-center"
                data-testid="pipeline-empty"
              >
                <p className="text-ink-2">No prospects yet.</p>
                <p className="mt-2 text-sm text-ink-3">
                  Open a report or pitch pack and choose <strong className="font-medium text-ink">Add to pipeline</strong>.
                </p>
                <Link to="/" className="mt-4 inline-block text-accent hover:underline">
                  Run a site analysis
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
        )}

        {!readOnly && sharePath && board && board.cards.length > 0 && (
          <p className="mt-6 text-xs text-ink-3">
            View link: <span className="font-mono text-ink-2">{sharePath}</span>
          </p>
        )}
      </div>
    </div>
  );
}
