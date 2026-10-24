import { describe, it, expect } from 'vitest';
import {
  vacancyMonthlyEmptyHeadline,
  vacancyAboveFoldIntro,
  vacancyAboveFoldPrompt,
} from '../lib/vacancy-cost-copy';

describe('vacancy cost copy', () => {
  it('states monthly empty cost as broker estimate', () => {
    const line = vacancyMonthlyEmptyHeadline(12_500);
    expect(line).toMatch(/Every month this space sits empty costs about/);
    expect(line).toMatch(/\$12,500/);
    expect(line).toMatch(/Your estimate/);
    expect(line).not.toMatch(/[\u2013\u2014]/);
  });

  it('labels placeholders as examples not facts', () => {
    expect(vacancyAboveFoldIntro()).toMatch(/examples/i);
    expect(vacancyAboveFoldPrompt()).toMatch(/Enter square footage/);
  });
});
