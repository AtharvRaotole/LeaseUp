import { describe, expect, it } from 'vitest';
import type { ProspectingStep } from '@leaseup/contracts';
import {
  agentReceiptJson,
  agentReceiptMarkdown,
  buildAgentReceiptRows,
  loggedProspectingSteps,
  plainProspectingStepResult,
} from '../lib/agent-receipt';
import { DEMO_PROSPECTING_RECEIPT_JOB } from '../lib/demo-prospecting-receipt-fixture';
import { findBrokerJargonViolations } from '../lib/broker-visible-jargon';

describe('agent receipt', () => {
  it('includes only logged steps, not pending placeholders', () => {
    const steps: ProspectingStep[] = [
      { id: 'geocode', label: 'Geocode', status: 'complete', summary: 'Done' },
      { id: 'taste', label: 'Taste', status: 'pending' },
    ];
    expect(loggedProspectingSteps(steps)).toHaveLength(1);
    expect(buildAgentReceiptRows({ ...DEMO_PROSPECTING_RECEIPT_JOB, steps })).toHaveLength(1);
  });

  it('plainifies worker summaries with store index wording', () => {
    expect(
      plainProspectingStepResult('OpenStreetMap unavailable; All The Places store data only')
    ).toBe('OpenStreetMap unavailable; our store index only');
  });

  it('exports JSON and Markdown from real job steps', () => {
    const job = DEMO_PROSPECTING_RECEIPT_JOB;
    const parsed = JSON.parse(agentReceiptJson(job)) as { steps: unknown[] };
    expect(parsed.steps).toHaveLength(8);
    const md = agentReceiptMarkdown(job);
    expect(md).toContain('### Geocode and confirm');
    expect(md).toContain('Why: Demo chip address maps to a fixed storefront pin.');
  });

  it('receipt copy avoids broker jargon patterns', () => {
    const job = DEMO_PROSPECTING_RECEIPT_JOB;
    const rows = buildAgentReceiptRows(job);
    const blob = rows.map((r) => `${r.label} ${r.dataSource} ${r.result} ${r.reason ?? ''}`).join('\n');
    expect(findBrokerJargonViolations(blob)).toEqual([]);
    expect(blob).not.toMatch(/\bATP\b/);
    expect(blob).not.toMatch(/\bQID\b/i);
  });
});
