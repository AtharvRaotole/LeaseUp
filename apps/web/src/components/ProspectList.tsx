import { useState } from 'react';
import type { ProspectPack, Location } from '@leaseup/contracts';

interface ProspectListProps {
  prospects: ProspectPack[];
  location: Location;
}

export function ProspectList({ prospects, location }: ProspectListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
        These brands show strong local affinity but have no nearby location (verified absent within {location.latitude ? '10km' : 'the area'}).
        Click any prospect to see the full outreach pack.
      </p>

      <div className="space-y-4">
        {prospects.map((prospect, idx) => (
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
                  {prospect.tenantMixScore && prospect.tenantMixScore.score > 0 && (
                    <span>Tenant Mix: {Math.round(prospect.tenantMixScore.score * 100)}%</span>
                  )}
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
                    <div className="mt-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(prospect.outreachDraft || 'Outreach draft not available');
                        }}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm"
                      >
                        Copy Outreach Draft
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
