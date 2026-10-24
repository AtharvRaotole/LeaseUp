import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { isAcceptableOutreachDraft } from '@leaseup/contracts';
import { OpenAIClient, buildOutreachPrompt, buildWhyBrandTastePrompt } from '../providers/openai';
import { sanitizeWhyBrandTasteSummary } from '@leaseup/fixtures/worker';
import type { Env } from '../index';
import {
  OUTREACH_TEMPLATE_DEMO_LABEL,
  OUTREACH_TEMPLATE_FALLBACK_LABEL,
} from '../lib/outreach-model-labels';

describe('buildWhyBrandTastePrompt', () => {
  it('asks for one sentence without affinity decimals in the output', () => {
    const prompt = buildWhyBrandTastePrompt({
      brandName: 'Ulta',
      signals: [{ kind: 'audience', name: 'Health & Beauty', affinity: 0.74, affinityRank: 27 }],
    });
    expect(prompt).toContain('exactly one short sentence');
    expect(prompt).toContain('Health & Beauty');
    expect(prompt).toMatch(/local audience rank #27/);
    expect(prompt).not.toContain('0.74');
    expect(prompt).toMatch(/resonates well/i);
  });
});

describe('sanitizeWhyBrandTasteSummary (worker)', () => {
  it('cleans model output before storing on prospects', () => {
    const cleaned = sanitizeWhyBrandTasteSummary('Yoga overlap at 0.80 resonates well.');
    expect(cleaned).not.toMatch(/\b0\.\d+\b/);
    expect(cleaned.toLowerCase()).not.toContain('resonates well');
  });
});

describe('buildOutreachPrompt', () => {
  it('includes only supplied facts and forbids invented statistics', () => {
    const prompt = buildOutreachPrompt({
      brandName: 'Madewell',
      address: '1574 N Milwaukee Ave, Chicago, IL',
      neighborhood: 'Wicker Park',
      affinityRank: 3,
      nearestStoreKm: 4.2,
      reasons: ['No store within 10km (All The Places store data)'],
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

  afterEach(() => {
    vi.unstubAllGlobals();
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
      expect(result.model).toBe(OUTREACH_TEMPLATE_DEMO_LABEL);
      expect(result.subject).not.toMatch(/—/);
      expect(result.subject).toContain('Test Brand');
      expect(result.body).toContain('Wicker Park');
      expect(result.body).not.toContain('foot traffic');
      expect(result.body).not.toContain('10 out of 10');
      expect(isAcceptableOutreachDraft(result.body)).toBe(true);
      expect(result.body).toMatch(/Qloo ranks/i);
    });

    it('labels template when live OpenAI fails', async () => {
      const liveEnv: Env = {
        DB: {} as D1Database,
        CACHE: {} as KVNamespace,
        APP_MODE: 'live',
        OPENAI_API_KEY: 'sk-test-key',
        OPENAI_MODEL: 'gpt-4o-mini',
      };
      const liveClient = new OpenAIClient(liveEnv);
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => ({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        }))
      );

      const result = await liveClient.generateOutreach({
        brandName: 'Vans',
        address: '1574 N Milwaukee Ave, Chicago, IL',
        reasons: ['No store within 10 km'],
        affinityRank: 13,
        neighborhood: 'Wicker Park',
      });

      expect(result.model).toBe(OUTREACH_TEMPLATE_FALLBACK_LABEL);
      expect(result.model).not.toBe('gpt-4o-mini');
      expect(result.subject).not.toMatch(/—/);
      expect(isAcceptableOutreachDraft(result.body)).toBe(true);
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
