import type { DemoFixtureId } from './demo-addresses.js';
import type { BrandExplainabilityRecording } from './qloo-explainability.js';
import boulderRei from './brand-explainability/boulder-205AF33F-118E-4C49-9721-6BDBAF981DA0.json';
import boulderUlta from './brand-explainability/boulder-0F77E9A4-121C-4941-ACE1-28502DBF1865.json';
import wickerTjMaxx from './brand-explainability/wicker-A94FC7B6-34D3-4970-9EA5-2D17C49E84B6.json';
import wickerWfm from './brand-explainability/wicker-1E5D90F5-5E0D-4486-B651-D0E7B8A6BE23.json';
import seviervilleSephora from './brand-explainability/sevierville-2C5054E1-8691-4F52-83CD-310D029BA6A3.json';

const BY_CHIP_AND_BRAND: Record<string, BrandExplainabilityRecording> = {
  [`boulder:${boulderRei.brandEntityId}`]: boulderRei as BrandExplainabilityRecording,
  [`boulder:${boulderUlta.brandEntityId}`]: boulderUlta as BrandExplainabilityRecording,
  [`wicker:${wickerWfm.brandEntityId}`]: wickerWfm as BrandExplainabilityRecording,
  [`wicker:${wickerTjMaxx.brandEntityId}`]: wickerTjMaxx as BrandExplainabilityRecording,
  [`sevierville:${seviervilleSephora.brandEntityId}`]:
    seviervilleSephora as BrandExplainabilityRecording,
};

export function brandExplainabilityForDemo(
  chip: DemoFixtureId,
  brandEntityId: string
): BrandExplainabilityRecording | null {
  return BY_CHIP_AND_BRAND[`${chip}:${brandEntityId}`] ?? null;
}

export function listDemoExplainabilityRecordings(): BrandExplainabilityRecording[] {
  return Object.values(BY_CHIP_AND_BRAND);
}
