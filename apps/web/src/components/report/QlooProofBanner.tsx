import type { AnalysisResponse } from '@leaseup/contracts';
import { Card } from '../ui/Card';
import { qlooProofSentence, qlooProofWinner } from '../../lib/qloo-proof';

export function QlooProofBanner({ results }: { results: AnalysisResponse }) {
  const baseline = results.backtestBaseline;
  if (!baseline) return null;

  const winner = qlooProofWinner(results.backtest, baseline);
  const sentence = qlooProofSentence(results.backtest, baseline);

  return (
    <Card className="border-accent/20 bg-surface" data-testid="qloo-proof-banner">
      <p className="font-serif text-lg text-ink">{sentence}</p>
      <p className="mt-2 text-sm text-ink-2">
        {winner === 'qloo' &&
          'National chain size alone misses which brands already fit this pin. Qloo ranks by local taste.'}
        {winner === 'baseline' &&
          'At this pin, chain size alone matched nearby stores as well as taste. We still show both rankings.'}
        {winner === 'tie' &&
          'Taste and chain-size baselines tied on this backtest. Compare row movement below.'}
      </p>
    </Card>
  );
}
