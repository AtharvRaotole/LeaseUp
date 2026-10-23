import { useRef, useState, type RefObject } from 'react';
import type { AnalysisRequest, AnalysisResponse, VacancyCalculatorInput } from '@leaseup/contracts';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { VacancyCostCalculator } from './VacancyCostCalculator';
import { apiUrl } from '../../lib/api';
import type { ReportMapCaptureRef } from './ReportMap';
import { copyPitchLinkToClipboard } from '../../lib/share-pitch-copy';

export function SharePitchDialog({
  open,
  onOpenChange,
  results,
  request,
  mapCaptureRef,
  vacancy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: AnalysisResponse;
  request: AnalysisRequest;
  mapCaptureRef: RefObject<ReportMapCaptureRef | null>;
  vacancy: VacancyCalculatorInput;
}) {
  const [landlordName, setLandlordName] = useState('');
  const [landlordContact, setLandlordContact] = useState('');
  const [vacancyDraft, setVacancyDraft] = useState(vacancy);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pitchUrl, setPitchUrl] = useState<string | null>(null);
  const [copyHint, setCopyHint] = useState<string | null>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const selectLink = () => {
    const el = linkInputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  };

  const create = async () => {
    setBusy(true);
    setError(null);
    setCopyHint(null);
    try {
      const mapImage = mapCaptureRef.current?.captureSnapshot() ?? undefined;
      const res = await fetch(apiUrl('/api/pitch'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          results,
          radiusKm: request.radius,
          mapImage,
          landlord: {
            name: landlordName.trim() || undefined,
            contact: landlordContact.trim() || undefined,
          },
          vacancy: vacancyDraft,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? 'Could not create pitch link');
      }
      const snapshot = (await res.json()) as { id: string };
      const url = `${window.location.origin}/pitch/${snapshot.id}`;
      setPitchUrl(url);
      const copy = await copyPitchLinkToClipboard(url);
      if (copy.copied) {
        setCopyHint('Link copied to your clipboard.');
      } else {
        setCopyHint('Select the link below and copy it (clipboard access was blocked).');
        requestAnimationFrame(() => selectLink());
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const copyAgain = async () => {
    if (!pitchUrl) return;
    setCopyHint(null);
    const copy = await copyPitchLinkToClipboard(pitchUrl);
    if (copy.copied) {
      setCopyHint('Link copied to your clipboard.');
      return;
    }
    setCopyHint('Select the link below and copy it.');
    selectLink();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="share-pitch-title">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-card border border-border bg-surface p-5 shadow-pop">
        <h2 id="share-pitch-title" className="font-display font-semibold text-2xl text-ink">Share pitch pack</h2>
        <p className="mt-1 text-sm text-ink-2">
          Creates a frozen snapshot with today&apos;s rankings and map. The link stays read only.
        </p>

        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="text-label uppercase text-ink-3">Landlord name (optional)</span>
            <Input className="mt-1 h-11" value={landlordName} onChange={(e) => setLandlordName(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="text-label uppercase text-ink-3">Landlord contact (optional)</span>
            <Input
              className="mt-1 h-11"
              value={landlordContact}
              onChange={(e) => setLandlordContact(e.target.value)}
              placeholder="email or phone"
            />
          </label>
        </div>

        <VacancyCostCalculator
          className="mt-4 border-0 bg-transparent p-0 shadow-none"
          compact
          initial={vacancyDraft}
          onChange={setVacancyDraft}
        />

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        {pitchUrl && (
          <div className="mt-4 space-y-2">
            <label className="block text-sm">
              <span className="text-label uppercase text-ink-3">Public pitch link</span>
              <Input
                ref={linkInputRef}
                readOnly
                className="mt-1 h-11 font-mono text-sm"
                value={pitchUrl}
                data-testid="share-pitch-link"
                onFocus={(e) => e.currentTarget.select()}
              />
            </label>
            {copyHint && (
              <p className="text-sm text-ink-2" data-testid="share-pitch-copy-hint">
                {copyHint}
              </p>
            )}
            <Button type="button" variant="secondary" size="sm" onClick={() => void copyAgain()}>
              Select and copy
            </Button>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" onClick={() => void create()} disabled={busy}>
            {busy ? 'Creating…' : pitchUrl ? 'Create another link' : 'Create public link'}
          </Button>
          {pitchUrl && (
            <Button type="button" variant="secondary" onClick={() => window.open(pitchUrl, '_blank')}>
              Open pitch
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
