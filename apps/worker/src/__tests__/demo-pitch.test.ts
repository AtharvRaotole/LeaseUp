import { describe, expect, it, vi } from 'vitest';
import { DEMO_PITCH_BOULDER_ULTA_ID } from '@leaseup/contracts';
import { PitchPackSnapshotSchema } from '@leaseup/contracts';
import { PitchService } from '../services/pitch';

describe('demo pitch share links', () => {
  it('serves Boulder Ulta demo pitch without D1', async () => {
    const prepare = vi.fn();
    const service = new PitchService({
      DB: { prepare } as unknown as D1Database,
    } as import('../index').Env);

    const snapshot = await service.get(DEMO_PITCH_BOULDER_ULTA_ID);
    expect(prepare).not.toHaveBeenCalled();
    expect(snapshot).not.toBeNull();
    PitchPackSnapshotSchema.parse(snapshot);
    expect(snapshot!.id).toBe(DEMO_PITCH_BOULDER_ULTA_ID);
    expect(snapshot!.prospects[0]?.prospect.brand.name).toMatch(/Ulta/i);
    expect(snapshot!.address).toContain('Boulder');
  });
});
