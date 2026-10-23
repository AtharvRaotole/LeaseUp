import type { AnalysisResponse } from '@leaseup/contracts';
import { Card } from '../ui/Card';
import { qlooProofSentence, qlooProofTieDetail, qlooProofWinner } from '../../lib/qloo-proof';

export function QlooProofBanner({
  results,
  compact = false,
}: {
  results: AnalysisResponse;
  compact?: boolean;
}) {
  const baseline = results.backtestBaseline;
  if (!baseline) return null;

  const winner = qlooProofWinner(results.backtest, baseline);
  const sentence = qlooProofSentence(results.backtest, baseline);
  const tieDetail =
    winner === 'tie' ? qlooProofTieDetail(results.rankings) : null;
  const strict = results.strictEval;
  const legacySaturated =
    strict &&
    strict.legacyPresentAt10Qloo >= 10 &&
    strict.legacyPresentAt10Chain >= 10;

  if (compact) {
    return (
      <p className="text-sm text-ink-2" data-testid="qloo-proof-banner">
        <span className="font-medium text-ink">{sentence}</span>
        {legacySaturated &&
          ' Legacy P@10 is saturated; see strict Spearman and adaptive radius below.'}
        {winner === 'baseline' && !legacySaturated &&
          ' Chain-size baseline matched taste at this pin.'}
      </p>
    );
  }

  return (
    <Card className="border-accent/20 bg-surface" data-testid="qloo-proof-banner">
      <p className="font-serif text-lg text-ink">{sentence}</p>
      <p className="mt-2 text-sm text-ink-2">
        {winner === 'qloo' &&
          'National chain size alone misses which brands already fit this pin. Qloo ranks by local taste.'}
        {winner === 'baseline' &&
          'At this pin, chain size alone matched nearby stores as well as taste. We still show both rankings.'}
        {winner === 'tie' && (tieDetail ?? 'Taste and chain-size baselines tied on this backtest. Compare row movement below.')}
        {legacySaturated &&
          ' Legacy present-in-top-10 is maxed out at this pin. Strict evaluation uses Spearman correlation and a tighter density-based radius.'}
      </p>
    </Card>
  );
}
