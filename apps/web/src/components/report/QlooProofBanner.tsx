import type { AnalysisResponse } from '@leaseup/contracts';
import { Card } from '../ui/Card';
import { ShowMethod } from '../ui/ShowMethod';
import {
  qlooProofBrokerBanner,
  qlooProofSentence,
  qlooProofSentenceTechnical,
  qlooProofTieDetailTechnical,
  twinRankingLine,
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

  const { headline, cohortLine, tieNote, methodDetail, caveat } = qlooProofBrokerBanner(results);
  const blend = results.backtestBlended ?? results.backtest;
  const legacySentence = qlooProofSentence(blend, baseline);
  const technical = qlooProofSentenceTechnical(blend, baseline);
  const tieTechnical = qlooProofTieDetailTechnical(results.rankings);
  const twinLine = twinRankingLine(results);

  if (compact) {
    return (
      <div className="text-sm text-ink-2" data-testid="qloo-proof-banner">
        <p>
          <span className="font-medium text-ink">{headline}</span>
        </p>
        <p className="mt-2 text-sm text-ink-2">{cohortLine}</p>
        {tieNote && <p className="mt-1 text-sm text-ink-2">{tieNote}</p>}
        {twinLine && (
          <p className="mt-1 text-sm text-ink-2" data-testid="twin-ranking-line">
            {twinLine}
          </p>
        )}
        <ShowMethod>
          <p>{methodDetail}</p>
          <p>{caveat}</p>
          <p>{legacySentence}</p>
          <p>{technical}</p>
          {tieTechnical && <p>{tieTechnical}</p>}
        </ShowMethod>
      </div>
    );
  }

  return (
    <Card className="border-accent/20 bg-surface" data-testid="qloo-proof-banner">
      <p className="font-display font-semibold text-lg text-ink">{headline}</p>
      <p className="mt-2 text-sm text-ink-2">{cohortLine}</p>
      {tieNote && <p className="mt-2 text-sm text-ink-2">{tieNote}</p>}
      {twinLine && (
        <p className="mt-2 text-sm text-ink-2" data-testid="twin-ranking-line">
          {twinLine}
        </p>
      )}
      <ShowMethod>
        <p className="mt-3 text-sm text-ink-2">{methodDetail}</p>
        <p className="mt-2 text-xs text-ink-3">{caveat}</p>
        <p className="mt-2 text-sm text-ink-2">{legacySentence}</p>
        <p>{technical}</p>
        {tieTechnical && <p>{tieTechnical}</p>}
      </ShowMethod>
    </Card>
  );
}
