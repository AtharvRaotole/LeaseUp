import { describe, it, expect, beforeEach } from 'vitest';
import { isAcceptableOutreachDraft } from '@leaseup/contracts';
import { OpenAIClient, buildOutreachPrompt } from '../providers/openai';
import type { Env } from '../index';

describe('buildOutreachPrompt', () => {
  it('includes only supplied facts and forbids invented statistics', () => {
    const prompt = buildOutreachPrompt({
      brandName: 'Madewell',
      address: '1574 N Milwaukee Ave, Chicago, IL',
      neighborhood: 'Wicker Park',
      affinityRank: 3,
      nearestStoreKm: 4.2,
      reasons: ['No store within 10km (ATP verified)'],
    });

    expect(prompt).toContain('Madewell');
    expect(prompt).toContain('Wicker Park');
    expect(prompt).toContain('affinity rank');
    expect(prompt).toContain('4.2 km');
    expect(prompt).toContain('No store within 10km');
    expect(prompt).toMatch(/Do NOT invent foot traffic/i);
    expect(prompt).toMatch(/under 120 words/i);
    expect(prompt).toMatch(/No placeholders/i);
    expect(prompt).not.toContain('Local demographics:');
  });
});

describe('OpenAIClient', () => {
  let mockEnv: Env;
  let client: OpenAIClient;

  beforeEach(() => {
    mockEnv = {
      DB: {} as D1Database,
      CACHE: {} as KVNamespace,
      APP_MODE: 'demo',
      OPENAI_API_KEY: '',
      OPENAI_MODEL: 'gpt-4o-mini',
    };

    client = new OpenAIClient(mockEnv);
  });

  describe('generateOutreach', () => {
    it('returns demo outreach in demo mode', async () => {
      const result = await client.generateOutreach({
        brandName: 'Test Brand',
        address: '123 Main St',
        reasons: ['High affinity rank in Wicker Park'],
        affinityRank: 2,
        neighborhood: 'Wicker Park',
      });

      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('body');
      expect(result.model).toBe('gpt-4o-mini');
      expect(result.subject).toContain('Test Brand');
      expect(result.body).toContain('Wicker Park');
      expect(result.body).not.toContain('foot traffic');
      expect(result.body).not.toContain('10 out of 10');
      expect(isAcceptableOutreachDraft(result.body)).toBe(true);
      expect(result.body).toMatch(/Qloo ranks/i);
    });

    it('includes brand name in subject', async () => {
      const result = await client.generateOutreach({
        brandName: 'Lululemon',
        address: '123 Main St',
        reasons: ['High affinity'],
      });

      expect(result.subject).toContain('Lululemon');
    });
  });
});
