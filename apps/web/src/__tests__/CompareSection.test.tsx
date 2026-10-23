import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CompareSection } from '../components/report/CompareSection';

describe('CompareSection', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows unavailable message on 502 without throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => ({ error: 'upstream' }),
      })
    );

    render(<CompareSection />);

    await waitFor(() => {
      expect(screen.getByText('Comparison unavailable right now.')).toBeTruthy();
    });
  });
});
