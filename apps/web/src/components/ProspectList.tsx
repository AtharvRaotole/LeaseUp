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
    navigator.clipboard.writeText(text);
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
          <div key={prospect.brand.entityId} className="prospect-card">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-brand-700">#{idx + 1}</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">{prospect.brand.name}</h4>
                    <p className="text-sm text-gray-600">
                      Affinity Rank: {(prospect.brand.affinityRank * 100).toFixed(1)}%
                      {prospect.brand.nationalStoreCount && (
                        <span className="ml-2">• {prospect.brand.nationalStoreCount} US locations</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 text-sm mb-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Tenant Fit: {(prospect.tenantMixScore.score * 100).toFixed(0)}%
                  </span>
                  {prospect.brand.verified && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ Verified Absent
                    </span>
                  )}
                </div>

                <div className="text-sm text-gray-700">
                  <p className="font-semibold mb-2">Why this location works:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {prospect.reasons.slice(0, 3).map((reason, i) => (
                      <li key={i}>{reason}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => toggleExpand(prospect.brand.entityId)}
                className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {expandedId === prospect.brand.entityId ? 'Hide' : 'View'} Outreach Pack
              </button>
            </div>

            {expandedId === prospect.brand.entityId && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-semibold text-gray-900">Draft Outreach Email</h5>
                  <button
                    onClick={() => copyToClipboard(prospect.outreachDraft)}
                    className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                  >
                    Copy to Clipboard
                  </button>
                </div>
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                  {prospect.outreachDraft}
                </pre>
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-xs text-yellow-900">
                    <strong>Review before sending:</strong> This draft is generated based on data insights.
                    Customize it with your property details and contact information.
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
