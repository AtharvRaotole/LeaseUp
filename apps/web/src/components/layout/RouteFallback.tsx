export function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center bg-bg px-4" role="status" aria-live="polite">
      <p className="text-sm text-ink-2">Loading…</p>
    </div>
  );
}
