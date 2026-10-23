import { useEffect, useState, type KeyboardEvent } from 'react';
import type { PipelineCard, PipelineColumn, PipelineOutreachStatus } from '@leaseup/contracts';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { PIPELINE_COLUMNS, columnLabel, nextColumn, prevColumn } from '../../lib/pipeline-columns';
import {
  generatePipelineOutreach,
  updatePipelineCard,
} from '../../lib/pipeline-api';
import { formatUserFacingDate } from '../../lib/format-date';

export function PipelineCardDialog({
  card,
  readOnly,
  open,
  onOpenChange,
  onBoardUpdated,
}: {
  card: PipelineCard | null;
  readOnly?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBoardUpdated: () => void;
}) {
  const [notes, setNotes] = useState('');
  const [recipient, setRecipient] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [busy, setBusy] = useState(false);
  const [draftBusy, setDraftBusy] = useState(false);
  const [localDraft, setLocalDraft] = useState(card?.outreachDraft);
  const [outreachStatus, setOutreachStatus] = useState<PipelineOutreachStatus>('none');

  useEffect(() => {
    if (!card) return;
    setNotes(card.notes);
    setRecipient(card.recipientEmail ?? '');
    setFollowUp(card.followUpAt?.slice(0, 10) ?? '');
    setLocalDraft(card.outreachDraft);
    setOutreachStatus(card.outreachStatus ?? 'none');
  }, [card, card?.notes, card?.recipientEmail, card?.followUpAt, card?.outreachDraft, card?.outreachStatus]);

  if (!card) return null;

  const savePatch = async (patch: Parameters<typeof updatePipelineCard>[1]) => {
    setBusy(true);
    try {
      await updatePipelineCard(card.id, patch);
      onBoardUpdated();
    } finally {
      setBusy(false);
    }
  };

  const moveTo = async (column: PipelineColumn) => {
    await savePatch({ column });
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (readOnly) return;
    if (e.key === 'ArrowRight') {
      const n = nextColumn(card.column);
      if (n) void moveTo(n);
    }
    if (e.key === 'ArrowLeft') {
      const p = prevColumn(card.column);
      if (p) void moveTo(p);
    }
  };

  const mailtoHref =
    localDraft && recipient.trim()
      ? `mailto:${encodeURIComponent(recipient.trim())}?subject=${encodeURIComponent(localDraft.subject)}&body=${encodeURIComponent(localDraft.body)}`
      : null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[min(90vh,720px)] w-[min(100vw-2rem,520px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-card border border-border bg-surface shadow-pop"
          onKeyDown={onKeyDown}
          data-testid="pipeline-card-dialog"
        >
          <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <Dialog.Title className="font-display font-semibold text-xl text-ink">{card.brandName}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-ink-2">
                {card.propertyAddress}
              </Dialog.Description>
            </div>
            <Dialog.Close
              type="button"
              className="rounded-control p-1 text-ink-2 hover:bg-surface-2"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="text-ink-3">Stage</span>
              <span className="font-medium text-ink">{columnLabel(card.column)}</span>
              <span className="text-ink-3">·</span>
              <span className="text-ink-3">Rank #{card.affinityRank}</span>
              <span className="text-ink-3">·</span>
              <span className="text-ink-2">{card.verification}</span>
            </div>

            {!readOnly && (
              <div className="flex flex-wrap gap-2">
                {PIPELINE_COLUMNS.map((col) => (
                  <Button
                    key={col.id}
                    type="button"
                    size="sm"
                    variant={card.column === col.id ? 'primary' : 'secondary'}
                    disabled={busy || card.column === col.id}
                    onClick={() => void moveTo(col.id)}
                  >
                    {col.label}
                  </Button>
                ))}
              </div>
            )}

            {(card.pitchLink || card.reportPath) && (
              <div className="flex flex-wrap gap-3 text-sm">
                {card.pitchLink && (
                  <a href={card.pitchLink} className="text-accent hover:underline" target="_blank" rel="noreferrer">
                    Pitch pack
                  </a>
                )}
                {card.reportPath && (
                  <a href={card.reportPath} className="text-accent hover:underline">
                    Report
                  </a>
                )}
              </div>
            )}

            <p className="text-xs text-ink-3">
              Last touched {formatUserFacingDate(card.lastTouchedAt)}
            </p>

            {!readOnly && (
              <>
                <label className="block text-sm">
                  <span className="text-label uppercase text-ink-3">Recipient email (you enter)</span>
                  <input
                    type="email"
                    className="mt-1 w-full rounded-control border border-border bg-surface-2 px-3 py-2 text-sm text-ink"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    onBlur={() => void savePatch({ recipientEmail: recipient })}
                    placeholder="brand.contact@example.com"
                    autoComplete="off"
                  />
                </label>

                <label className="block text-sm">
                  <span className="text-label uppercase text-ink-3">Follow-up reminder</span>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-control border border-border bg-surface-2 px-3 py-2 text-sm text-ink"
                    value={followUp}
                    onChange={(e) => setFollowUp(e.target.value)}
                    onBlur={() =>
                      void savePatch({ followUpAt: followUp ? `${followUp}T12:00:00.000Z` : null })
                    }
                  />
                </label>

                <label className="block text-sm">
                  <span className="text-label uppercase text-ink-3">Notes</span>
                  <textarea
                    className="mt-1 min-h-[88px] w-full rounded-control border border-border bg-surface-2 px-3 py-2 text-sm text-ink"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onBlur={() => void savePatch({ notes })}
                  />
                </label>

                <label className="block text-sm">
                  <span className="text-label uppercase text-ink-3">Outreach status (you set)</span>
                  <select
                    className="mt-1 w-full rounded-control border border-border bg-surface-2 px-3 py-2 text-sm text-ink"
                    value={outreachStatus}
                    onChange={(e) => {
                      const v = e.target.value as PipelineOutreachStatus;
                      setOutreachStatus(v);
                      void savePatch({ outreachStatus: v });
                    }}
                    data-testid="pipeline-outreach-status"
                  >
                    <option value="none">Not drafted</option>
                    <option value="drafted">Drafted</option>
                    <option value="sent">Sent</option>
                    <option value="replied">Replied</option>
                  </select>
                </label>

                <div className="rounded-card border border-border bg-surface-2/50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-ink">Outreach draft</h4>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={draftBusy}
                      onClick={() => {
                        setDraftBusy(true);
                        void generatePipelineOutreach(card.id)
                          .then(() => onBoardUpdated())
                          .finally(() => setDraftBusy(false));
                      }}
                    >
                      {draftBusy ? 'Drafting…' : localDraft ? 'Regenerate' : 'Generate draft'}
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-ink-3">
                    Grounded in saved report facts only. Never sent automatically.
                  </p>
                  {localDraft && (
                    <div className="mt-3 space-y-2 text-sm">
                      <p className="font-medium text-ink">Subject: {localDraft.subject}</p>
                      <pre className="whitespace-pre-wrap font-sans text-ink-2">{localDraft.body}</pre>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            void navigator.clipboard.writeText(
                              `Subject: ${localDraft.subject}\n\n${localDraft.body}`
                            )
                          }
                        >
                          Copy draft
                        </Button>
                        {mailtoHref && (
                          <a href={mailtoHref}>
                            <Button type="button" size="sm" variant="primary">
                              Open in mail app
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {readOnly && card.notes && (
              <p className="text-sm text-ink-2 whitespace-pre-wrap">{card.notes}</p>
            )}
          </div>

          {!readOnly && (
            <p className="border-t border-border px-4 py-2 text-xs text-ink-3">
              Tip: with this dialog focused, use ← → arrow keys to move stages.
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
