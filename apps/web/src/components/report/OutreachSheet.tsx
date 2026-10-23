import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { AnalysisResponse, ProspectPack } from '@leaseup/contracts';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { apiUrl } from '../../lib/api';

export function OutreachSheet({
  open,
  onOpenChange,
  prospect,
  results,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prospect: ProspectPack | null;
  results: AnalysisResponse;
}) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      if (!prospect) throw new Error('No prospect');
      const res = await fetch(apiUrl('/api/outreach'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: prospect.brand.name,
          address: results.location.resolvedAddress || results.location.address,
          reasons: prospect.reasons,
          runId: results.runId,
          affinityRank: prospect.brand.affinityRank,
          neighborhood: results.location.neighborhood || results.location.city,
          nearestStoreKm: prospect.nearestExistingStoreKm,
        }),
      });
      if (!res.ok) throw new Error('Draft failed');
      return (await res.json()) as { draft: string; model: string | null };
    },
  });

  useEffect(() => {
    if (open && prospect && !mutation.data && !mutation.isPending) {
      mutation.mutate();
    }
  }, [open, prospect, mutation.data, mutation.isPending, mutation.mutate]);

  useEffect(() => {
    if (mutation.data?.draft) {
      setBody(mutation.data.draft);
      const firstLine = mutation.data.draft.split('\n')[0] ?? '';
      setSubject(firstLine.startsWith('Subject:') ? firstLine.replace(/^Subject:\s*/, '') : `Space near ${results.location.neighborhood || 'your site'}`);
    }
  }, [mutation.data, results.location.neighborhood]);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={prospect ? `Outreach to ${prospect.brand.name}` : 'Outreach'}
      footer={<p className="text-meta text-ink-3">LeaseUp never sends email for you.</p>}
    >
      {!prospect ? null : mutation.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="text-label uppercase text-ink-3">To</span>
            <input className="mt-1 w-full rounded-control border border-border bg-surface px-3 py-2" placeholder="you@company.com" />
          </label>
          <label className="block text-sm">
            <span className="text-label uppercase text-ink-3">Subject</span>
            <input
              className="mt-1 w-full rounded-control border border-border bg-surface px-3 py-2"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-label uppercase text-ink-3">Body</span>
            <textarea
              className="mt-1 min-h-[200px] w-full rounded-control border border-border bg-surface px-3 py-2"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigator.clipboard.writeText(body)}>
              Copy email
            </Button>
            <Button variant="ghost" onClick={() => mutation.mutate()}>
              Regenerate
            </Button>
          </div>
          {mutation.data?.model && (
            <p className="text-meta text-ink-3">Model: {mutation.data.model}</p>
          )}
        </div>
      )}
    </Sheet>
  );
}
