import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { copyPitchLinkToClipboard } from '../lib/share-pitch-copy';

describe('copyPitchLinkToClipboard', () => {
  const original = globalThis.navigator;

  beforeEach(() => {
    vi.stubGlobal('navigator', {
      ...original,
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns copied when clipboard succeeds', async () => {
    const result = await copyPitchLinkToClipboard('https://leaseup.app/pitch/abc');
    expect(result).toEqual({ ok: true, copied: true });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://leaseup.app/pitch/abc');
  });

  it('returns clipboard_denied without throwing when write fails', async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error('denied'));
    const result = await copyPitchLinkToClipboard('https://leaseup.app/pitch/abc');
    expect(result).toEqual({ ok: true, copied: false, reason: 'clipboard_denied' });
  });

  it('returns clipboard_unavailable when clipboard API is missing', async () => {
    vi.stubGlobal('navigator', { ...original, clipboard: undefined });
    const result = await copyPitchLinkToClipboard('https://leaseup.app/pitch/abc');
    expect(result).toEqual({ ok: true, copied: false, reason: 'clipboard_unavailable' });
  });
});
