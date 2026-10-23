export type CopyPitchLinkResult =
  | { ok: true; copied: true }
  | { ok: true; copied: false; reason: 'clipboard_denied' | 'clipboard_unavailable' };

/** Copy pitch URL; never throws when the link itself is valid. */
export async function copyPitchLinkToClipboard(url: string): Promise<CopyPitchLinkResult> {
  if (!navigator.clipboard?.writeText) {
    return { ok: true, copied: false, reason: 'clipboard_unavailable' };
  }
  try {
    await navigator.clipboard.writeText(url);
    return { ok: true, copied: true };
  } catch {
    return { ok: true, copied: false, reason: 'clipboard_denied' };
  }
}
