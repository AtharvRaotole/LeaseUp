import type { ReactNode } from 'react';

export function ShowMethod({
  children,
  label = 'Show method',
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <details className="group text-sm text-ink-2">
      <summary className="cursor-pointer list-none font-medium text-accent marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="underline decoration-accent/40 underline-offset-2 group-open:no-underline">
          {label}
        </span>
      </summary>
      <div className="mt-2 space-y-2 border-l-2 border-border pl-3">{children}</div>
    </details>
  );
}
