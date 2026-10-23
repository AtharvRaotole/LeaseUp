/** Count pages in a PDF buffer (Chromium / pdf-lib compatible structure). */
export function countPdfPages(buffer: Buffer): number {
  const text = buffer.toString('latin1');
  const matches = text.match(/\/Type\s*\/Page\b/g);
  return matches?.length ?? 0;
}
