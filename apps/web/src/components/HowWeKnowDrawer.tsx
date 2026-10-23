import { useState } from 'react';
import type { AnalysisResponse } from '@leaseup/contracts';

interface HowWeKnowDrawerProps {
  results: AnalysisResponse | null;
}

export function HowWeKnowDrawer({ results }: HowWeKnowDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="no-print fixed bottom-4 right-4 z-50">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="glass rounded-full px-4 py-2 text-sm font-medium hover:border-accent"
      >
        How we know
      </button>
      {open && (
        <div className="absolute bottom-12 right-0 w-[min(100vw-2rem,24rem)] glass rounded-xl p-4 shadow-glow text-sm space-y-3">
          <p className="font-semibold">Data sources</p>
          <ul className="list-disc pl-5 text-zinc-400 space-y-1">
            <li>Qloo Taste AI — brand affinity rankings (live or recorded fixtures)</li>
            <li>All The Places (CC0) — store locations for backtest & absence</li>
            <li>OpenStreetMap Overpass — second-source absence check</li>
            <li>OpenAI gpt-4o-mini — outreach drafts on click only</li>
          </ul>
          {results && (
            <>
              <p className="font-semibold pt-2">This run</p>
              <p className="text-zinc-400">
                Mode: <span className="text-zinc-200">{results.mode ?? 'demo'}</span> · Data quality:{' '}
                {results.dataQuality}
              </p>
              <p className="text-zinc-400">
                Chain prior weight: {results.chainPriorWeight ?? 0.25} (prospect ordering only)
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
