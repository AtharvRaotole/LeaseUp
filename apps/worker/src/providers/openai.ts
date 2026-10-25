import type { Env } from '../index';
import { recordApiMetric } from '../middleware/metrics';
import {
  buildGroundedOutreachBody,
  buildGroundedSubject,
  polishOutreachDraft,
} from '../lib/outreach-draft';
import {
  OUTREACH_TEMPLATE_DEMO_LABEL,
  OUTREACH_TEMPLATE_FALLBACK_LABEL,
} from '../lib/outreach-model-labels';
import { sanitizeWhyBrandTasteSummary } from '@leaseup/fixtures/worker';

export interface OutreachDraft {
  subject: string;
  body: string;
  model: string;
}

export interface WhyBrandTasteFacts {
  brandName: string;
  signals: Array<{ kind: 'tag' | 'audience'; name: string; affinity: number; affinityRank: number }>;
  runId?: string;
}

export function buildWhyBrandTastePrompt(facts: WhyBrandTasteFacts): string {
  const lines = facts.signals.map(
    (s, i) =>
      `${i + 1}. ${s.kind === 'tag' ? 'Taste tag' : 'Audience'}: ${s.name} (local audience rank #${s.affinityRank})`
  );
  return [
    `Brand: ${facts.brandName}`,
    '',
    'Verified Qloo overlap: these names are in the brand top audiences and among top audiences near the site.',
    'Use only these names (do not add interests, stats, or affinity scores):',
    ...lines,
    '',
    'Write exactly one short sentence for a broker pitch brief.',
    'Rules:',
    '- Name the audience or tag labels above in plain English; do not repeat them as a separate "Audience:" list.',
    '- Never print decimals between 0 and 1, affinity scores, or generic praise (no "resonates well", "trendy lifestyles").',
    '- No em dashes; no invented demographics or foot traffic.',
    'Return JSON: {"summary":"..."}',
  ].join('\n');
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
  brandReach?: {
    status: 'verified' | 'not_yet_found';
    url?: string;
    source?: string;
    searchUrl?: string;
  };
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
  if (facts.brandReach?.status === 'verified' && facts.brandReach.url) {
    lines.push(`Official brand real-estate page (cite this URL, do not invent contacts): ${facts.brandReach.url}`);
  } else if (facts.brandReach?.status === 'not_yet_found' && facts.brandReach.searchUrl) {
    lines.push(
      `No verified brand real-estate page in LeaseUp data. Suggest the broker search the brand site: ${facts.brandReach.searchUrl}`
    );
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

/** Max "why this brand" sentences per batched call. */
export const WHY_BRAND_BATCH_MAX = 5;

export function buildWhyBrandTasteBatchPrompt(facts: WhyBrandTasteFacts[]): string {
  const sections = facts.map((f, i) =>
    [
      `### Brand ${i + 1}`,
      buildWhyBrandTastePrompt(f).replace(/\nReturn JSON: \{"summary":"\.\.\."\}$/, ''),
    ].join('\n')
  );
  return [
    `Write one sentence per brand section below (${facts.length} sections). Use only that section's names.`,
    '',
    ...sections,
    '',
    `Return JSON: {"summaries":["..."]} with exactly ${facts.length} strings in section order.`,
  ].join('\n');
}

/** Max drafts per batched call; keeps max_tokens bounded. */
export const OUTREACH_BATCH_MAX = 3;

/**
 * One gpt-4o-mini prompt for several outreach drafts, so a live prospecting
 * run spends one subrequest on drafts instead of one per brand.
 */
export function buildOutreachBatchPrompt(facts: OutreachFacts[]): string {
  const sections = facts.map((f, i) =>
    [
      `### Draft ${i + 1}`,
      buildOutreachPrompt(f).replace(/\n\nFormat your response as JSON[^\n]*$/, ''),
    ].join('\n')
  );
  return [
    `Write ${facts.length} separate broker outreach emails, one per section below.`,
    'Each section has its own brand and its own verified facts; never mix facts across sections.',
    '',
    ...sections,
    '',
    `Format your response as JSON: {"drafts":[{"subject":"...","body":"..."}]} with exactly ${facts.length} drafts in section order.`,
  ].join('\n');
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
      return this.getTemplateOutreach(params, OUTREACH_TEMPLATE_FALLBACK_LABEL);
    }
  }

  /**
   * Batched drafts: one model call for up to OUTREACH_BATCH_MAX brands. Any draft
   * the model does not return falls back to the labelled template, so labels stay honest.
   */
  async generateOutreachBatch(items: OutreachFacts[]): Promise<OutreachDraft[]> {
    const facts = items.slice(0, OUTREACH_BATCH_MAX);
    if (facts.length === 0) return [];
    if (this.mode === 'demo') {
      return facts.map((f) => this.getDemoOutreach(f));
    }
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
            { role: 'user', content: buildOutreachBatchPrompt(facts) },
          ],
          temperature: 0.4,
          max_tokens: 300 * facts.length,
          response_format: { type: 'json_object' },
        }),
      });
      await recordApiMetric(this.db, {
        runId: facts[0]?.runId,
        provider: 'openai',
        endpoint: '/chat/completions',
        statusCode: response.status,
        latencyMs: Date.now() - start,
        cached: false,
      });
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }
      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
      };
      const parsed = JSON.parse(data.choices[0]?.message.content || '{}') as {
        drafts?: Array<{ subject?: unknown; body?: unknown }>;
      };
      const drafts = Array.isArray(parsed.drafts) ? parsed.drafts : [];
      return facts.map((f, i) => {
        const d = drafts[i];
        if (!d || typeof d.subject !== 'string' || typeof d.body !== 'string' || !d.body.trim()) {
          return this.getTemplateOutreach(f, OUTREACH_TEMPLATE_FALLBACK_LABEL);
        }
        return {
          ...polishOutreachDraft(d.subject, d.body, f),
          model: this.model,
        };
      });
    } catch (err) {
      console.error('OpenAI batch outreach error:', err);
      return facts.map((f) => this.getTemplateOutreach(f, OUTREACH_TEMPLATE_FALLBACK_LABEL));
    }
  }

  getModelName(): string {
    return this.model;
  }

  /** One gpt-4o-mini call for several "why this brand" sentences; undefined entries fall back. */
  async summarizeWhyBrandTasteBatch(
    items: WhyBrandTasteFacts[]
  ): Promise<Array<string | undefined>> {
    const facts = items.slice(0, WHY_BRAND_BATCH_MAX);
    if (this.mode === 'demo' || facts.length === 0) return facts.map(() => undefined);
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
                'You write one factual sentence per brand about Qloo taste overlap. Never invent signals, affinity decimals, or generic marketing language.',
            },
            { role: 'user', content: buildWhyBrandTasteBatchPrompt(facts) },
          ],
          temperature: 0.2,
          max_tokens: 100 * facts.length,
          response_format: { type: 'json_object' },
        }),
      });
      await recordApiMetric(this.db, {
        runId: facts[0]?.runId,
        provider: 'openai',
        endpoint: '/chat/completions',
        statusCode: response.status,
        latencyMs: Date.now() - start,
        cached: false,
      });
      if (!response.ok) return facts.map(() => undefined);
      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
      };
      const parsed = JSON.parse(data.choices[0]?.message.content || '{}') as {
        summaries?: unknown[];
      };
      const rows = Array.isArray(parsed.summaries) ? parsed.summaries : [];
      return facts.map((_, i) => {
        const raw = rows[i];
        if (typeof raw !== 'string') return undefined;
        const cleaned = sanitizeWhyBrandTasteSummary(raw.trim());
        return cleaned || undefined;
      });
    } catch {
      return facts.map(() => undefined);
    }
  }

  async summarizeWhyBrandTaste(facts: WhyBrandTasteFacts): Promise<string | undefined> {
    if (this.mode === 'demo') {
      return undefined;
    }
    if (facts.signals.length === 0) return undefined;

    const prompt = buildWhyBrandTastePrompt(facts);
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
                'You write one factual sentence about Qloo taste overlap. Never invent signals, affinity decimals, or generic marketing language.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 120,
          response_format: { type: 'json_object' },
        }),
      });

      await recordApiMetric(this.db, {
        runId: facts.runId,
        provider: 'openai',
        endpoint: '/chat/completions',
        statusCode: response.status,
        latencyMs: Date.now() - start,
        cached: false,
      });

      if (!response.ok) return undefined;

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
      };
      const content = data.choices[0]?.message.content || '{}';
      const parsed = JSON.parse(content) as { summary?: string };
      const summary = parsed.summary?.trim();
      const cleaned = summary ? sanitizeWhyBrandTasteSummary(summary) : '';
      return cleaned || undefined;
    } catch {
      return undefined;
    }
  }

  private getDemoOutreach(params: OutreachFacts): OutreachDraft {
    return this.getTemplateOutreach(params, OUTREACH_TEMPLATE_DEMO_LABEL);
  }

  private getTemplateOutreach(params: OutreachFacts, modelLabel: string): OutreachDraft {
    const subject = buildGroundedSubject(params);
    const body = buildGroundedOutreachBody(params);
    return { subject, body, model: modelLabel };
  }
}
