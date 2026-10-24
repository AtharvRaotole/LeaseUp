import type { ProspectingJob, ProspectingStep, ProspectingStepId } from '@leaseup/contracts';

/** Plain broker copy for step summaries logged by the worker. */
export function plainProspectingStepResult(summary?: string): string {
  if (!summary?.trim()) return 'Finished';
  return summary
    .replace(/All The Places store data/gi, 'our store index')
    .replace(/All The Places/gi, 'our store index')
    .replace(/\bATP\b/g, 'store index')
    .replace(/\bOSM\b/g, 'OpenStreetMap')
    .replace(/\bQID\b/gi, 'brand id')
    .replace(/\bQloo\b/gi, 'taste data')
    .replace(/[\u2013\u2014]/g, '-');
}

const PIPELINE_STEP_ORDER: ProspectingStepId[] = [
  'geocode',
  'taste',
  'scan_stores',
  'verify_osm',
  'rank_backtest',
  'explain_top5',
  'draft_outreach',
  'pitch_pack',
];

const DEFAULT_LABEL_BY_ID: Record<ProspectingStepId, string> = {
  geocode: 'Confirm storefront address',
  agent_plan: 'Plan site checks',
  taste: 'Read neighborhood taste',
  scan_stores: 'Scan for missing chains',
  verify_osm: 'Check stores in two directories',
  rank_backtest: 'Rank and back-test',
  explain_top5: 'Explain top prospects',
  draft_outreach: 'Draft outreach emails',
  pitch_pack: 'Assemble pitch pack',
};

function sitePlaceLabel(job: ProspectingJob): string {
  const loc = job.confirmedLocation;
  const neighborhood = loc?.neighborhood?.trim();
  if (neighborhood) return neighborhood;
  const resolved = loc?.resolvedAddress?.trim();
  if (resolved) return resolved;
  const address = loc?.address?.trim() || job.input.address.trim();
  return address || 'this site';
}

export function receiptStepLabel(step: ProspectingStep): string {
  const label = step.label.trim();
  if (/double-check absence/i.test(label)) return DEFAULT_LABEL_BY_ID.verify_osm;
  if (/prove it \(backtest\)/i.test(label)) return DEFAULT_LABEL_BY_ID.rank_backtest;
  if (/read the neighborhood/i.test(label)) return DEFAULT_LABEL_BY_ID.taste;
  if (/find who'?s missing/i.test(label)) return DEFAULT_LABEL_BY_ID.scan_stores;
  if (/locate storefront/i.test(label)) return DEFAULT_LABEL_BY_ID.geocode;
  if (/draft outreach/i.test(label)) return DEFAULT_LABEL_BY_ID.draft_outreach;
  if (/assemble pitch/i.test(label)) return DEFAULT_LABEL_BY_ID.pitch_pack;
  return DEFAULT_LABEL_BY_ID[step.id] ?? plainProspectingStepResult(label);
}

function receiptTasteSummary(summary: string, job: ProspectingJob): string {
  const place = sitePlaceLabel(job);
  const countMatch = summary.match(/^(\d+)\s+brands ranked/i);
  const count = countMatch?.[1];
  if (count) {
    const radius = job.input.radius;
    return `${count} brands ranked for ${place} (${radius} km trade area)`;
  }
  return plainProspectingStepResult(summary)
    .replace(/-?\d+\.\d+\s*,\s*-?\d+\.\d+(\s*\(\d+\s*km\))?/gi, place)
    .replace(/\(\d+km\)/i, `(${job.input.radius} km trade area)`);
}

function brandsPhrase(count: number, singular: string, plural: string): string {
  const n = Number(count);
  if (n === 1) return `1 ${singular}`;
  return `${n} ${plural}`;
}

function receiptVerifySummary(summary: string): string {
  let plain = plainProspectingStepResult(summary);
  plain = plain.replace(/(\d+)\s+verified\s*\(\s*2 sources\s*\)/gi, (_match, n: string) =>
    brandsPhrase(Number(n), 'brand confirmed in both directories', 'brands confirmed in both directories')
  );
  plain = plain.replace(/(\d+)\s+single source/gi, (_match, n: string) =>
    brandsPhrase(
      Number(n),
      'brand checked in one directory only',
      'brands checked in one directory only'
    )
  );
  return plain;
}

function receiptBacktestSummary(step: ProspectingStep): string {
  const detail = step.detail;
  if (detail && typeof detail === 'object') {
    const rawN = detail.rawPresentInTop10;
    const blendN = detail.blendedPresentInTop10;
    const randomN = detail.randomExpectedPresentAt10;
    const adaptiveKm = detail.adaptiveRadiusKm;
    if (typeof rawN === 'number' && typeof blendN === 'number') {
      const radiusNote =
        typeof adaptiveKm === 'number' ? ` (${adaptiveKm} km study radius)` : '';
      if (
        rawN >= 10 &&
        blendN >= 10 &&
        typeof randomN === 'number' &&
        randomN < 2
      ) {
        return `Small local opening sample${radiusNote}. Top picks looked strong; treat as directional, not a guarantee.`;
      }
      return `Back-test${radiusNote}: our top picks matched ${blendN} of 10 known openings in the study (raw ranking ${rawN} of 10).`;
    }
  }

  const summary = step.summary ?? '';
  const legacy = summary.match(/Raw P@10\s*(\d+)%\s*[·.]?\s*Blended P@10\s*(\d+)%/i);
  if (legacy) {
    const rawPct = Number(legacy[1]);
    const blendPct = Number(legacy[2]);
    const rawN = Math.round(rawPct / 10);
    const blendN = Math.round(blendPct / 10);
    if (rawPct === 100 && blendPct === 100) {
      return 'Top picks matched every tracked opening in this small study. Treat as directional only.';
    }
    return `Back-test: our top picks matched about ${blendN} of 10 known openings (raw ranking about ${rawN} of 10).`;
  }

  const adaptive = summary.match(/Adaptive\s+([\d.]+)\s*km/i);
  const rawSlash = summary.match(/raw\s+(\d+)\/10/i);
  const blendSlash = summary.match(/blend\s+(\d+)\/10/i);
  if (rawSlash && blendSlash) {
    const rawN = Number(rawSlash[1]);
    const blendN = Number(blendSlash[1]);
    const radiusNote = adaptive ? ` (${adaptive[1]} km study radius)` : '';
    return `Back-test${radiusNote}: our top picks matched ${blendN} of 10 known openings in the study (raw ranking ${rawN} of 10).`;
  }

  return plainProspectingStepResult(summary);
}

export function receiptStepResult(step: ProspectingStep, job: ProspectingJob): string {
  const summary = step.summary ?? '';
  if (step.id === 'taste' || /brands ranked/i.test(summary)) {
    return receiptTasteSummary(summary, job);
  }
  if (step.id === 'verify_osm' || /verified.*source/i.test(summary)) {
    return receiptVerifySummary(summary);
  }
  if (step.id === 'rank_backtest' || /backtest/i.test(step.label) || /P@10/i.test(summary)) {
    return receiptBacktestSummary(step);
  }
  if (step.id === 'geocode' && job.confirmedLocation) {
    const loc = job.confirmedLocation;
    return loc.resolvedAddress || loc.neighborhood || loc.address || plainProspectingStepResult(summary);
  }
  return plainProspectingStepResult(summary);
}

export function sortPipelineReceiptSteps(steps: ProspectingStep[]): ProspectingStep[] {
  const rank = new Map(PIPELINE_STEP_ORDER.map((id, index) => [id, index]));
  return [...steps].sort((a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99));
}

export const PLANNER_TOOL_PLAIN_NAMES: Record<string, string> = {
  qloo_brand_insights: 'brand taste panel',
  store_presence_lookup: 'store presence lookup',
  nearest_store_check: 'nearest store check',
  chain_size_fallback: 'chain size fallback',
  enrich_site_stratum: 'site context',
};

const UUID_RE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

export function plainPlannerToolId(toolId: string): string {
  const key = toolId.trim();
  if (!key) return '';
  return PLANNER_TOOL_PLAIN_NAMES[key] ?? key.replace(/_/g, ' ');
}

/** Replace snake_case tool ids only; do not paraphrase surrounding model text. */
export function replacePlannerToolIdsInText(text: string): string {
  let out = text;
  for (const [id, label] of Object.entries(PLANNER_TOOL_PLAIN_NAMES)) {
    out = out.replace(new RegExp(id, 'gi'), label);
  }
  return out;
}

export function stripPlannerUuidsFromText(text: string): string {
  return text
    .replace(UUID_RE, '')
    .replace(/\bfor brand\s*[.,]?/gi, 'for that brand.')
    .replace(/\bbrand\s*[.,]?\s*$/gi, 'that brand.')
    .replace(/\s+,/g, ',')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function sanitizePlannerReasonText(raw: string): string {
  return stripPlannerUuidsFromText(replacePlannerToolIdsInText(plainProspectingStepResult(raw)));
}

export function sanitizePlannerResultSummary(raw: string): string {
  let text = sanitizePlannerReasonText(raw);
  text = text.replace(/\bQloo returned\b/gi, 'Taste data returned');
  text = text.replace(/\btaste data returned\b/gi, 'Taste data returned');
  return text;
}

/** @deprecated Use sanitizePlannerResultSummary */
export function plainPlannerToolResult(summary: string): string {
  return sanitizePlannerResultSummary(summary);
}
