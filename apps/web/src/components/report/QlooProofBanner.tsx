import type { AnalysisResponse } from '@leaseup/contracts';
import { Card } from '../ui/Card';
import { ShowMethod } from '../ui/ShowMethod';
import {
  qlooProofEvalLead,
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

  const { lead, pinDetail, caveat, legacySaturated } = qlooProofEvalLead(results);
  const winner = qlooProofWinner(results.backtest, baseline);
  const legacySentence = qlooProofSentence(results.backtest, baseline);
  const tieDetail =
    winner === 'tie' ? qlooProofTieDetail(results.rankings) : null;
  const technical = qlooProofSentenceTechnical(results.backtest, baseline);
  const tieTechnical =
    winner === 'tie' ? qlooProofTieDetailTechnical(results.rankings) : null;

  if (compact) {
    return (
      <div className="text-sm text-ink-2" data-testid="qloo-proof-banner">
        <p>
          <span className="font-medium text-ink">{lead}</span>
        </p>
        {pinDetail && <p className="mt-2 text-sm text-ink-2">{pinDetail}</p>}
        <p className="mt-2 text-xs text-ink-3">{caveat}</p>
        <ShowMethod>
          <p>{legacySentence}</p>
          {legacySaturated && <p>Legacy P@10 saturated at this pin.</p>}
          <p>{technical}</p>
          {tieTechnical && <p>{tieTechnical}</p>}
        </ShowMethod>
      </div>
    );
  }

  return (
    <Card className="border-accent/20 bg-surface" data-testid="qloo-proof-banner">
      <p className="font-display font-semibold text-lg text-ink">{lead}</p>
      {pinDetail && <p className="mt-2 text-sm text-ink-2">{pinDetail}</p>}
      <p className="mt-2 text-sm text-ink-2">
        {winner === 'tie' &&
          (tieDetail ??
            'Taste and chain size tied on the legacy nearby-match count; the cohort metrics above still show where Qloo adds signal.')}
        {winner === 'qloo' &&
          !legacySaturated &&
          'At this pin, taste also edges chain size on the legacy nearby-match count. Compare row movement below.'}
        {winner === 'baseline' &&
          !legacySaturated &&
          'At this pin, chain size matched or beat taste on the legacy nearby-match count. The cohort metrics still describe where taste helps on average.'}
        {legacySaturated &&
          winner === 'tie' &&
          ' The legacy 10 km nearby-match score is maxed out here, so we lean on cohort same-size AUC, the companion blend, and the tighter radius readout.'}
      </p>
      <p className="mt-3 text-xs text-ink-3">{caveat}</p>
      <ShowMethod>
        <p>{legacySentence}</p>
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
