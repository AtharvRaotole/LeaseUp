import { describe, it, expect } from 'vitest';
import {
  notFoundLine,
  pipelineEmptyAction,
  pipelineEmptyLine,
  portfolioEmptyAction,
  portfolioEmptyLine,
  reportShortListCategoryAction,
  reportShortListLine,
  reportShortListWidenAction,
  shareLinkExpiredLine,
} from '../lib/empty-state-copy';
import { SLOW_LOAD_STATUS } from '../lib/slow-load-copy';

const NO_DASH = /[\u2013\u2014]/;

describe('empty and edge-state copy', () => {
  it('uses plain lines without em or en dashes', () => {
    const lines = [
      pipelineEmptyLine,
      pipelineEmptyAction,
      portfolioEmptyLine,
      portfolioEmptyAction,
      notFoundLine,
      shareLinkExpiredLine,
      reportShortListWidenAction,
      reportShortListCategoryAction,
      SLOW_LOAD_STATUS,
      reportShortListLine(0, 10),
      reportShortListLine(1, 10),
      reportShortListLine(2, 10),
    ];
    for (const line of lines) {
      expect(line).not.toMatch(NO_DASH);
      expect(line.length).toBeGreaterThan(10);
    }
  });
});
