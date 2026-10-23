import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { PipelineAddCard } from '@leaseup/contracts';
import { Button } from '../ui/Button';
import { addPipelineCard } from '../../lib/pipeline-api';

export function AddToPipelineButton({
  buildPayload,
  size = 'sm',
  variant = 'secondary',
  className,
}: {
  buildPayload: () => PipelineAddCard;
  size?: 'sm' | 'md';
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setBusy(true);
    setError(null);
    try {
      await addPipelineCard(buildPayload());
      setDone(true);
      window.setTimeout(() => setDone(false), 4000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <Button
        type="button"
        size={size}
        variant={variant}
        disabled={busy}
        onClick={() => void onClick()}
        data-testid="add-to-pipeline"
      >
        {busy ? 'Saving…' : done ? 'Added to pipeline' : 'Add to pipeline'}
      </Button>
      {done && (
        <p className="mt-1 text-xs text-ink-3">
          <Link to="/pipeline" className="text-accent hover:underline">Open pipeline</Link>
        </p>
      )}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
