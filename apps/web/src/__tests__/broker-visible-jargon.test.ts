import { describe, it, expect } from 'vitest';
import { findBrokerJargonViolations } from '../lib/broker-visible-jargon';
import {
  evalHeadlineLabel,
  formatPanelValues,
} from '../lib/eval-display';
import { tasteFitMatchHerePhrase, fitPercentileLabel } from '../lib/fit-display';
import {
  methodologyDensityRadiusTooltip,
  methodologyRankMatchTooltip,
  verificationBrokerLabel,
} from '../lib/broker-copy';

describe('broker-visible jargon guards', () => {
  it('plain fit labels avoid raw taste-fit wording', () => {
    const line = tasteFitMatchHerePhrase(40, 200, 82);
    expect(findBrokerJargonViolations(line)).toEqual([]);
    expect(fitPercentileLabel(40, 200, 82)).not.toMatch(/taste fit/i);
  });

  it('verification broker labels avoid Verified/Unverified', () => {
    expect(findBrokerJargonViolations(verificationBrokerLabel('verified (2 sources)'))).toEqual([]);
    expect(findBrokerJargonViolations(verificationBrokerLabel('unverified (1 source)'))).toEqual([]);
  });

  it('eval headline and panel strings avoid AUC and P@10', () => {
    const snapshot = {
      headlineMetricId: 'same_size_auc',
      panels: [{ id: 'same_size_auc', label: 'Same-size AUC' }],
      notes: [],
    } as unknown as import('@leaseup/contracts').StrictEvalSnapshot;
    expect(findBrokerJargonViolations(evalHeadlineLabel(snapshot))).toEqual([]);
    expect(findBrokerJargonViolations(formatPanelValues(snapshot.panels[0]!))).toEqual([]);
  });

  it('methodology tooltips are plain broker copy', () => {
    for (const tip of [methodologyDensityRadiusTooltip(), methodologyRankMatchTooltip()]) {
      expect(findBrokerJargonViolations(tip)).toEqual([]);
      expect(tip).not.toMatch(/[\u2013\u2014]/);
    }
  });
});
