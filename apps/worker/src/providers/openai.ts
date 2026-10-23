import type { Env } from '../index';
import { recordApiMetric } from '../middleware/metrics';
import {
  buildGroundedOutreachBody,
  buildGroundedSubject,
  polishOutreachDraft,
} from '../lib/outreach-draft';

export interface OutreachDraft {
  subject: string;
  body: string;
  model: string;
}

export interface OutreachFacts {
  brandName: string;
  address: string;
  reasons: string[];
  affinityRank?: number;
  neighborhood?: string;
  nearestStoreKm?: number;
  demographics?: string;
  runId?: string;
  coTenantBrands?: string[];
  verificationLabel?: string;
}

export function buildOutreachPrompt(facts: OutreachFacts): string {
  const lines: string[] = [
    `Brand: ${facts.brandName}`,
    `Storefront address: ${facts.address}`,
  ];

  if (facts.neighborhood) {
    lines.push(`Neighborhood: ${facts.neighborhood}`);
  }
  if (facts.affinityRank !== undefined) {
    lines.push(`Qloo affinity rank (lower is stronger): ${facts.affinityRank}`);
  }
  if (facts.nearestStoreKm !== undefined) {
    lines.push(`Nearest existing ${facts.brandName} store: ${facts.nearestStoreKm.toFixed(1)} km away`);
  }
  if (facts.verificationLabel) {
    lines.push(`Verification: ${facts.verificationLabel}`);
  }
  if (facts.coTenantBrands?.length) {
    lines.push(`Nearby co-tenants (already in radius): ${facts.coTenantBrands.join(', ')}`);
  }

  lines.push(
    '',
    'Verified reasons to cite (use only these; do not add statistics or claims not listed here):',
    ...facts.reasons.map((r, i) => `${i + 1}. ${r}`),
    '',
    'Write a broker outreach email body under 120 words.',
    'Rules:',
    '- First sentence must state taste rank, verified absence (or nearest store distance), and nearby co-tenants when listed.',
    '- No placeholders (never use square brackets).',
    '- No "Dear …", no "I hope this finds you well", no generic pleasantries.',
    '- Use ONLY the facts above. Do NOT invent foot traffic, demographics, revenue, or performance statistics.',
    '',
    'Format your response as JSON with "subject" and "body" fields.',
  );

  return lines.join('\n');
}

export class OpenAIClient {
  private apiKey: string;
  private model: string;
  private mode: 'live' | 'demo';
  private db: D1Database;

  constructor(env: Env) {
    this.apiKey = env.OPENAI_API_KEY || '';
    this.model = env.OPENAI_MODEL || 'gpt-4o-mini';
    this.mode = env.APP_MODE === 'live' && this.apiKey ? 'live' : 'demo';
    this.db = env.DB;
  }

  async generateOutreach(params: OutreachFacts): Promise<OutreachDraft> {
    if (this.mode === 'demo') {
      return this.getDemoOutreach(params);
    }

    const prompt = buildOutreachPrompt(params);
    const start = Date.now();

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content:
                'You write terse, factual commercial real estate outreach. Never use placeholders or filler greetings. Never invent statistics.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.4,
          max_tokens: 320,
          response_format: { type: 'json_object' },
        }),
      });

      const latency = Date.now() - start;

      await recordApiMetric(this.db, {
        runId: params.runId,
        provider: 'openai',
        endpoint: '/chat/completions',
        statusCode: response.status,
        latencyMs: latency,
        cached: false,
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
      };

      const content = data.choices[0]?.message.content || '{}';
      const parsed = JSON.parse(content) as { subject: string; body: string };
      const polished = polishOutreachDraft(parsed.subject, parsed.body, params);

      return { ...polished, model: this.model };
    } catch (err) {
      console.error('OpenAI error:', err);
      return this.getDemoOutreach(params);
    }
  }

  getModelName(): string {
    return this.model;
  }

  private getDemoOutreach(params: OutreachFacts): OutreachDraft {
    const subject = buildGroundedSubject(params);
    const body = buildGroundedOutreachBody(params);
    return { subject, body, model: this.model };
  }
}
