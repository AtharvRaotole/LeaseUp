import { describe, it, expect, beforeEach } from 'vitest';
import { OpenAIClient } from '../providers/openai';
import type { Env } from '../index';

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
        reasons: ['High affinity', 'Good demographics'],
      });

      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('body');
      expect(result.subject).toContain('Test Brand');
      expect(result.body.length).toBeGreaterThan(100);
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
