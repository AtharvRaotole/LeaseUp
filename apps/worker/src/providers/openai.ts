import type { Env } from '../index';
import { recordApiMetric } from '../middleware/metrics';

export interface OutreachDraft {
  subject: string;
  body: string;
}

export class OpenAIClient {
  private apiKey: string;
  private model: string;
  private mode: 'live' | 'demo';
  private db: D1Database;

  constructor(env: Env) {
    this.apiKey = env.OPENAI_API_KEY || '';
    this.model = env.OPENAI_MODEL || 'gpt-4o-mini';
    this.mode = (env.APP_MODE === 'live' && this.apiKey) ? 'live' : 'demo';
    this.db = env.DB;
  }

  async generateOutreach(params: {
    brandName: string;
    address: string;
    reasons: string[];
    demographics?: string;
    runId?: string;
  }): Promise<OutreachDraft> {
    if (this.mode === 'demo') {
      return this.getDemoOutreach(params.brandName);
    }

    const prompt = `You are a commercial real estate leasing broker. Write a professional, compelling outreach email to ${params.brandName} about a vacant retail space.

Location: ${params.address}

Why this location is a great fit for ${params.brandName}:
${params.reasons.map((r, i) => `${i + 1}. ${r}`).join('\n')}

${params.demographics ? `Local demographics: ${params.demographics}` : ''}

Write a concise email (200-300 words) that:
1. Opens with a personalized hook about their brand
2. Highlights the specific location opportunity
3. References the data-driven reasons this location matches their customer base
4. Closes with a clear call to action

Keep the tone professional but warm. Do not use overly salesy language. Focus on the data insights.

Format your response as JSON with "subject" and "body" fields.`;

    const start = Date.now();

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: 'You are a commercial real estate expert who writes data-driven outreach emails.' },
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

      const data = await response.json() as {
        choices: Array<{ message: { content: string } }>;
      };

      const content = data.choices[0]?.message.content || '{}';
      const parsed = JSON.parse(content) as OutreachDraft;

      return parsed;
    } catch (err) {
      console.error('OpenAI error:', err);
      return this.getDemoOutreach(params.brandName);
    }
  }

  private getDemoOutreach(brandName: string): OutreachDraft {
    return {
      subject: `Prime Retail Opportunity for ${brandName} - Data-Driven Location Match`,
      body: `Dear ${brandName} Real Estate Team,

I hope this message finds you well. I'm reaching out about an exceptional retail opportunity that our location intelligence analysis has identified as an outstanding match for ${brandName}.

We have a premium storefront available in an area where Qloo's taste AI shows remarkably high affinity for ${brandName}'s brand profile. Our data indicates strong local demand, with the existing tenant mix showing excellent co-affinity with your customer base.

Key insights from our analysis:
• High brand affinity score in the local market
• Strong demographic alignment with your target customer
• Proven success of similar brands in the immediate area
• Growing foot traffic and neighborhood vitality

I'd welcome the opportunity to share the detailed location analysis and discuss this opportunity further. The data makes a compelling case for ${brandName}'s success in this market.

Would you be available for a brief call next week to review the full analysis?

Best regards,
Your Leasing Team

P.S. Our backtest shows we correctly predicted 10 out of 10 existing stores in this neighborhood - we're confident about this match.`,
    };
  }
}
