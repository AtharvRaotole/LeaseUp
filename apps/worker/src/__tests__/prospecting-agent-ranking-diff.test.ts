import { describe, expect, it } from 'vitest';
import type { ProspectPack } from '@leaseup/contracts';
import { computeAgentProspectRankingDiff } from '../lib/prospecting-agent-ranking-diff';

function pack(entityId: string, name: string): ProspectPack {
  return {
    brand: {
      entityId,
      name,
      affinity: 0.8,
      affinityRank: 1,
      verified: 'verified (2 sources)',
    },
    reasons: ['Test reason'],
    outreachDraft: 'Hello',
  };
}

describe('computeAgentProspectRankingDiff', () => {
  it('reports no change when top five match', () => {
    const baseline = ['a', 'b', 'c', 'd', 'e'].map((id) => pack(id, `Brand ${id}`));
    const diff = computeAgentProspectRankingDiff({
      baselinePacks: baseline,
      agentPacks: [...baseline],
      plannerSteps: [],
      dagHooks: {},
    });
    expect(diff.unchanged).toBe(true);
    expect(diff.summaryLines).toEqual(['The agent kept the standard ranking.']);
  });

  it('attributes a removal to nearest store planner step', () => {
    const baseline = ['a', 'b', 'c'].map((id) => pack(id, `Brand ${id}`));
    const agent = [pack('b', 'Brand b'), pack('c', 'Brand c'), pack('d', 'Brand d')];
    const diff = computeAgentProspectRankingDiff({
      baselinePacks: baseline,
      agentPacks: agent,
      plannerSteps: [
        {
          stepIndex: 1,
          planner: 'model',
          reason:
            'Agent: confirm top pitch prospects have no confirmed store inside the absence radius before outreach.',
          tool: 'nearest_store_check',
          toolArgs: { entityId: 'a' },
          resultSummary: 'Nearest store 0.40 km.',
          durationMs: 12,
        },
      ],
      dagHooks: { excludeProspectEntityIds: new Set(['a']) },
    });
    expect(diff.unchanged).toBe(false);
    expect(diff.changes.some((c) => c.kind === 'removed' && c.brandName === 'Brand a')).toBe(true);
    expect(diff.summaryLines[0]).toMatch(/Dropped Brand a/);
    console.log(JSON.stringify({ exampleLiveShapedRankingDiff: diff }, null, 2));
  });
});
