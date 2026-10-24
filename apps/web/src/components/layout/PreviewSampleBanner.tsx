/** Shown on /__preview/* pages when those routes are enabled (screenshots and local dev). */
export function PreviewSampleBanner() {
  return (
    <p
      className="rounded-control border border-border bg-surface-2 px-3 py-2 text-center text-sm text-ink-2"
      data-testid="preview-sample-data"
    >
      Sample data
    </p>
  );
}
