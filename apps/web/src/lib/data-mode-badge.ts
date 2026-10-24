export type DataModeBadge = {
  label: string;
  shortLabel: string;
  tone: 'success' | 'warn';
};

/**
 * Header badge copy. A page that shows recorded data (the demo chip reports replay committed
 * recordings) never claims live data, even when the worker itself runs in live mode.
 */
export function dataModeBadge(workerMode: string | undefined, pageData?: 'recorded' | 'live'): DataModeBadge {
  if (pageData === 'recorded') {
    return { label: 'Recorded demo', shortLabel: 'Recorded', tone: 'warn' };
  }
  if (workerMode === 'live') {
    return { label: 'Live data', shortLabel: 'Live', tone: 'success' };
  }
  return { label: 'Demo data', shortLabel: 'Demo', tone: 'warn' };
}

/**
 * What the report page is showing. Loaded results decide; before they arrive, a demo chip
 * request is known to replay its recording, so the header never flashes a live claim.
 */
export function reportPageData(
  resultsMode: 'live' | 'demo' | undefined,
  isRecordedDemoChip: boolean,
): 'recorded' | 'live' | undefined {
  if (resultsMode === 'demo') return 'recorded';
  if (resultsMode === 'live') return 'live';
  return isRecordedDemoChip ? 'recorded' : undefined;
}
