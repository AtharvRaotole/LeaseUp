import { describe, it, expect } from 'vitest';
import { resolveAgentEntityId } from '../lib/prospecting-agent-tools';
import type { QlooInsight } from '../providers/qloo';

const panel = [
  { entity_id: '11111111-2222-4333-8444-555555555555', name: 'Victoria’s Secret' },
  { entity_id: '66666666-7777-4888-8999-000000000000', name: 'H&M' },
] as unknown as QlooInsight[];

describe('resolveAgentEntityId', () => {
  it('keeps a real panel id', () => {
    expect(resolveAgentEntityId('66666666-7777-4888-8999-000000000000', panel)).toEqual({
      ok: true,
      entityId: '66666666-7777-4888-8999-000000000000',
    });
  });
  it('resolves a brand name the model passed to the fetched panel id', () => {
    expect(resolveAgentEntityId("Victoria's Secret", panel)).toMatchObject({
      ok: true,
      entityId: '11111111-2222-4333-8444-555555555555',
    });
    expect(resolveAgentEntityId('H and M', panel)).toMatchObject({ ok: true });
  });
  it('never guesses outside the panel', () => {
    expect(resolveAgentEntityId('Starbucks', panel)).toEqual({
      ok: false,
      reason: 'not_in_panel',
      asked: 'Starbucks',
    });
    expect(resolveAgentEntityId('', panel)).toEqual({ ok: false, reason: 'missing' });
  });
});
