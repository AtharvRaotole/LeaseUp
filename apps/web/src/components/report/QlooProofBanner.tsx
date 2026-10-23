import type { AnalysisResponse } from '@leaseup/contracts';
import { Card } from '../ui/Card';
import { ShowMethod } from '../ui/ShowMethod';
import {
  qlooProofSentence,
  qlooProofSentenceTechnical,
  qlooProofTieDetail,
  qlooProofTieDetailTechnical,
  qlooProofWinner,
} from '../../lib/qloo-proof';

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
  const technical = qlooProofSentenceTechnical(results.backtest, baseline);
  const tieTechnical =
    winner === 'tie' ? qlooProofTieDetailTechnical(results.rankings) : null;

  if (compact) {
    return (
      <div className="text-sm text-ink-2" data-testid="qloo-proof-banner">
        <p>
          <span className="font-medium text-ink">{sentence}</span>
          {winner === 'baseline' && ' Chain size alone matched taste at this pin.'}
        </p>
        <ShowMethod>
          <p>{technical}</p>
          {tieTechnical && <p>{tieTechnical}</p>}
        </ShowMethod>
      </div>
    );
  }

  return (
    <Card className="border-accent/20 bg-surface" data-testid="qloo-proof-banner">
      <p className="font-display font-semibold text-lg text-ink">{sentence}</p>
      <p className="mt-2 text-sm text-ink-2">
        {winner === 'qloo' &&
          'National chain count alone misses which brands already fit this neighborhood. Local taste data reorders the list.'}
        {winner === 'baseline' &&
          'At this pin, chain size alone matched nearby stores as well as taste. You can still compare both orderings below.'}
        {winner === 'tie' && (tieDetail ?? 'Taste and chain size tied on nearby-store match. Compare row movement below.')}
      </p>
      <ShowMethod>
        <p>{technical}</p>
        {tieTechnical && <p>{tieTechnical}</p>}
        <p>
          Backtest counts how many top-ranked brands already have a store in your radius. Chain-size
          baseline re-sorts the same candidate pool by national store count.
        </p>
      </ShowMethod>
    </Card>
  );
}
