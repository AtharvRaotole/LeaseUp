import { describe, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEMO_CHIP_ADDRESSES } from '@leaseup/fixtures';
import { PitchPackSnapshotSchema } from '@leaseup/contracts';
import { AnalysisService } from '../services/analysis';
import { buildDemoBoulderUltaPitchSnapshot } from '../lib/pitch-snapshot';
import { liveAudiencesOnlyAssets } from './helpers/analysis-test-env';

const db = {
  prepare: () => {
    const stmt = {
      bind: () => stmt,
      run: async () => ({}),
      first: async () => null,
    };
    return stmt;
  },
} as unknown as D1Database;

describe('fixture generator', () => {
  it('writes boulder ulta demo pitch json when GEN_DEMO_PITCH_BOULDER=1', async () => {
    if (process.env.GEN_DEMO_PITCH_BOULDER !== '1') return;
    const service = new AnalysisService({
      DB: db,
      CACHE: { get: async () => null, put: async () => undefined } as unknown as KVNamespace,
      APP_MODE: 'demo',
      ASSETS: liveAudiencesOnlyAssets(),
    } as import('../index').Env);
    const results = await service.analyze(
      { address: DEMO_CHIP_ADDRESSES.boulder, radius: 10 },
      'demo-pitch-gen',
      'ip'
    );
    const snapshot = buildDemoBoulderUltaPitchSnapshot(results);
    PitchPackSnapshotSchema.parse(snapshot);
    const out = join(process.cwd(), '../../packages/fixtures/src/demo-pitch-boulder-ulta.json');
    writeFileSync(out, JSON.stringify(snapshot, null, 2));
  });
});
