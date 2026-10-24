import { describe, expect, it } from 'vitest';
import { previewRoutesEnabled } from '../lib/preview-routes';

describe('previewRoutesEnabled', () => {
  it('is on in Vite dev', () => {
    expect(previewRoutesEnabled({ DEV: true })).toBe(true);
  });

  it('is off in production without build flag', () => {
    expect(previewRoutesEnabled({ DEV: false })).toBe(false);
    expect(previewRoutesEnabled({ DEV: false, VITE_PREVIEW_ROUTES: '' })).toBe(false);
  });

  it('is on when VITE_PREVIEW_ROUTES is set at build time', () => {
    expect(previewRoutesEnabled({ DEV: false, VITE_PREVIEW_ROUTES: '1' })).toBe(true);
    expect(previewRoutesEnabled({ DEV: false, VITE_PREVIEW_ROUTES: 'true' })).toBe(true);
  });
});
