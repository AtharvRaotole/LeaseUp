import type { AnalysisResponse } from '@leaseup/contracts';
import { BacktestCard } from './BacktestCard';
import { ProspectList } from './ProspectList';

interface ResultsViewProps {
  results: AnalysisResponse;
}

export function ResultsView({ results }: ResultsViewProps) {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Analysis for{' '}
          {results.location.neighborhood ||
            results.location.city ||
            results.location.resolvedAddress?.split(',')[0] ||
            results.location.address}
        </h2>
        <p className="text-gray-600 mb-4">{results.location.resolvedAddress}</p>
        
        {results.warnings.length > 0 && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="font-semibold text-yellow-900 mb-2">Considerations:</p>
            <ul className="list-disc list-inside space-y-1">
              {results.warnings.map((warning, idx) => (
                <li key={idx} className="text-yellow-800 text-sm">{warning}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="metric-card">
            <p className="text-sm text-gray-600 mb-1">Data Quality</p>
            <p className="text-2xl font-bold text-gray-900 capitalize">{results.dataQuality}</p>
          </div>
          <div className="metric-card">
            <p className="text-sm text-gray-600 mb-1">Prospects Found</p>
            <p className="text-2xl font-bold text-gray-900">{results.prospects.length}</p>
          </div>
          <div className="metric-card">
            <p className="text-sm text-gray-600 mb-1">Backtest P@10</p>
            <p className="text-2xl font-bold text-gray-900">
              {(results.backtest.precisionAt10 * 100).toFixed(0)}%
            </p>
          </div>
        </div>
      </div>

      <BacktestCard backtest={results.backtest} />

      {results.prospects.length > 0 ? (
        <ProspectList prospects={results.prospects} location={results.location} />
      ) : (
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <p className="text-lg text-gray-600">
            No high-confidence prospects found for this location.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Try a different location or radius.
          </p>
        </div>
      )}
    </div>
  );
}
