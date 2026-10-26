import { describe, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { OpenAiProspectingReviewClient } from '../lib/prospecting-agent-review';
import { buildReviewCases, RecordingReviewClient, runCase } from '../eval/review-judgment-cases';

/**
 * Records real gpt-4o-mini review turns for the 40 market backtest. Skipped in CI; run with
 * RECORD_REVIEW_JUDGMENT=1 and OPENAI_API_KEY set. review-judgment-backtest.test.ts replays the file.
 */
const enabled = process.env.RECORD_REVIEW_JUDGMENT === '1' && Boolean(process.env.OPENAI_API_KEY);

describe.skipIf(!enabled)('record gpt-4o-mini review judgment', () => {
  it('writes data/qloo-eval-40/review_judgment_model.json', async () => {
    const cases = buildReviewCases();
    const out: Record<string, unknown> = {};
    let calls = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    for (const c of cases) {
      const model = new OpenAiProspectingReviewClient(process.env.OPENAI_API_KEY as string, 'gpt-4o-mini');
      const rec = new RecordingReviewClient(model);
      const run = await runCase(c, rec);
      calls += model.usage.calls;
      promptTokens += model.usage.promptTokens;
      completionTokens += model.usage.completionTokens;
      // A fallback would switch to the rule client and break the replay, so fail instead.
      if (run.review.planner !== 'model') throw new Error(`model review fell back on ${c.siteId}`);
      out[c.siteId] = { turns: rec.turns };
    }
    const file = join(__dirname, '../../../../data/qloo-eval-40/review_judgment_model.json');
    const meta = { model: 'gpt-4o-mini', recordedAt: new Date().toISOString(), calls, promptTokens, completionTokens };
    writeFileSync(file, `${JSON.stringify({ meta, cases: out }, null, 1)}\n`);
    console.log('recorded', JSON.stringify(meta));
  }, 900_000);
});
