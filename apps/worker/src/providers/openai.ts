import type { Env } from '../index';
import { recordApiMetric } from '../middleware/metrics';

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

  lines.push(
    '',
    'Verified reasons to cite (use only these; do not add statistics or claims not listed here):',
    ...facts.reasons.map((r, i) => `${i + 1}. ${r}`),
    '',
    'Write a concise outreach email (200-300 words) for a commercial leasing broker.',
    'Use ONLY the facts above. Do NOT invent foot traffic, demographics, revenue, or performance statistics.',
    'If a fact is not listed, do not mention it.',
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
                'You write factual commercial real estate outreach. Never invent statistics or demographics.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 800,
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

      return { ...parsed, model: this.model };
    } catch (err) {
      console.error('OpenAI error:', err);
      return this.getDemoOutreach(params);
    }
  }

  getModelName(): string {
    return this.model;
  }

  private getDemoOutreach(params: OutreachFacts): OutreachDraft {
    const neighborhood = params.neighborhood ? ` in ${params.neighborhood}` : '';
    const rankLine =
      params.affinityRank !== undefined
        ? `Qloo ranks ${params.brandName} #${params.affinityRank} for local taste${neighborhood}.`
        : `Qloo shows strong local taste fit for ${params.brandName}${neighborhood}.`;
    const nearestLine =
      params.nearestStoreKm !== undefined
        ? `The nearest existing ${params.brandName} location is about ${params.nearestStoreKm.toFixed(1)} km away.`
        : '';

    const reasonBullets = params.reasons.slice(0, 3).map((r) => `• ${r}`).join('\n');

    return {
      subject: `Retail space opportunity for ${params.brandName} — ${params.address}`,
      body: `Hello ${params.brandName} team,

${rankLine}
${nearestLine}

${reasonBullets}

We have a storefront at ${params.address} and would like to share the analysis. Reply if you would like to review the location pack.

Best regards,
LeaseUp`,
      model: this.model,
    };
  }
}
