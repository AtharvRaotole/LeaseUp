import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { ProspectPack, Location } from '@leaseup/contracts';

interface ProspectListProps {
  prospects: ProspectPack[];
  location: Location;
}

export function ProspectList({ prospects, location }: ProspectListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const outreachMutation = useMutation({
    mutationFn: async (prospect: ProspectPack) => {
      const response = await fetch('/api/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: prospect.brand.name,
          address: location.resolvedAddress || location.address,
          reasons: prospect.reasons,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate outreach draft');
      }

      const data = (await response.json()) as { draft: string };
      return { id: prospect.brand.entityId, draft: data.draft };
    },
    onSuccess: ({ id, draft }) => {
      setDrafts((prev) => ({ ...prev, [id]: draft }));
    },
  });

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-bold text-gray-900 mb-2">
        "Not Here Yet" - High-Affinity Prospects
      </h3>
      <p className="text-gray-600 mb-6">
        These brands show strong local affinity but have no nearby location (verified absent within 10km).
        Generate an outreach draft on demand (never auto-sent).
      </p>

      <div className="space-y-4">
        {prospects.map((prospect, idx) => {
          const draft = drafts[prospect.brand.entityId] || prospect.outreachDraft;

          return (
            <div
              key={prospect.brand.entityId}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => toggleExpand(prospect.brand.entityId)}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">
                      #{idx + 1}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900">{prospect.brand.name}</h3>
                    {prospect.brand.verified === 'verified (2 sources)' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        ✓ Verified (2)
                      </span>
                    )}
                    {prospect.brand.verified === 'unverified (1 source)' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        ⚠ 1 source
                      </span>
                    )}
                    {prospect.brand.verified === 'conflict' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                        ⚠ Conflict
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Affinity: {Math.round(prospect.brand.affinity * 100)}%</span>
                    <span>Qloo rank: #{prospect.brand.affinityRank}</span>
                  </div>
                </div>

                <div className="text-sm text-gray-700">
                  <p className="font-semibold mb-2">Why this location works:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {prospect.reasons.slice(0, 3).map((reason, i) => (
                      <li key={i}>{reason}</li>
                    ))}
                  </ul>
                </div>

                {expandedId === prospect.brand.entityId && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="space-y-3">
                      <div>
                        <span className="font-semibold text-sm">National Presence:</span>
                        <span className="ml-2 text-sm text-gray-700">
                          {prospect.brand.nationalStoreCount || 'Unknown'} US locations
                        </span>
                      </div>
                      {prospect.brand.verificationSources && prospect.brand.verificationSources.length > 0 && (
                        <div>
                          <span className="font-semibold text-sm">Data Sources:</span>
                          <span className="ml-2 text-sm text-gray-700">
                            {prospect.brand.verificationSources.join(', ')}
                          </span>
                        </div>
                      )}
                      {draft && (
                        <pre className="text-xs bg-gray-50 p-3 rounded whitespace-pre-wrap">{draft}</pre>
                      )}
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            outreachMutation.mutate(prospect);
                          }}
                          disabled={outreachMutation.isPending}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50"
                        >
                          {draft ? 'Regenerate Outreach Draft' : 'Generate Outreach Draft'}
                        </button>
                        {draft && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(draft);
                            }}
                            className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors text-sm"
                          >
                            Copy Draft
                          </button>
                        )}
                      </div>
                      {outreachMutation.error && (
                        <p className="text-sm text-red-600">{(outreachMutation.error as Error).message}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
