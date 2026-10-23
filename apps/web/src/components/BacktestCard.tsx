import type { BacktestResult } from '@leaseup/contracts';

interface BacktestCardProps {
  backtest: BacktestResult;
}

export function BacktestCard({ backtest }: BacktestCardProps) {
  const getBadgeClass = (p: number) => {
    if (p >= 0.8) return 'high';
    if (p >= 0.6) return 'medium';
    return 'low';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900">Backtest Validation</h3>
        <span className={`backtest-badge ${getBadgeClass(backtest.precisionAt10)}`}>
          {(backtest.precisionAt10 * 100).toFixed(0)}% P@10
        </span>
      </div>

      <p className="text-gray-600 mb-6">
        This shows how well Qloo's affinity scores predict where brands <em>actually are</em> in this neighborhood.
        Our model correctly ranked{' '}
        <strong>{backtest.presentInTop10 ?? backtest.examples.filter((e) => e.rank <= 10).length}</strong>{' '}
        existing stores in the top 10.
      </p>

      {backtest.auc !== undefined && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>AUC Score: {backtest.auc.toFixed(3)}</strong> - This measures how well affinity
            ranks separate present stores from absent ones. Higher is better (max 1.0).
          </p>
        </div>
      )}

      <div className="space-y-3">
        <h4 className="font-semibold text-gray-900">Predicted Stores (Verified Present):</h4>
        {backtest.examples.length > 0 ? (
          <div className="space-y-2">
            {backtest.examples.map((example, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {example.rank}
                  </div>
                  <span className="font-medium text-gray-900">{example.name}</span>
                </div>
                <span className="text-sm text-gray-600">{example.distance.toFixed(1)} km away</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">No backtest examples available</p>
        )}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          <strong>Why this matters:</strong> A high backtest score proves the model isn't just guessing.
          When we say a brand has high affinity but isn't here yet, you can trust that insight is data-driven.
        </p>
      </div>
    </div>
  );
}
