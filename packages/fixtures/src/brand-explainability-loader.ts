import type { DemoFixtureId } from './demo-addresses.js';
import type { BrandExplainabilityRecording } from './qloo-explainability.js';
import {
  createBrandExplainabilityStore,
  type BrandExplainabilityStore,
  type LiveAudiencesCompact,
} from './brand-explainability-store.js';
import compact from './brand-explainability/live-audiences.compact.json';

/**
 * Bundled live audience recordings for the web app and tests. The worker does not use these: it loads
 * the same JSON from apps/worker/public via ASSETS (apps/worker/src/lib/live-audiences.ts). The store is
 * created lazily so bundlers can drop the JSON when these functions are unused (the worker imports
 * other parts of this package's main entry).
 */
let store: BrandExplainabilityStore | undefined;
function bundled(): BrandExplainabilityStore {
  return (store ??= createBrandExplainabilityStore(compact as LiveAudiencesCompact));
}

export function audiencePanelBaseline(): Record<string, number> {
  return bundled().audiencePanelBaseline();
}

export function audiencePanelSize(): number {
  return bundled().audiencePanelSize();
}

export function brandExplainabilityForDemo(
  chip: DemoFixtureId,
  brandEntityId: string,
  options?: { maxAudiences?: number },
): BrandExplainabilityRecording | null {
  return bundled().brandExplainabilityForDemo(chip, brandEntityId, options);
}

export function listDemoExplainabilityRecordings(): BrandExplainabilityRecording[] {
  return bundled().listDemoExplainabilityRecordings();
}
