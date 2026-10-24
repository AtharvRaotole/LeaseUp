import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function MethodologyTableScroll({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  const updateScrollHint = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const overflow = el.scrollWidth > el.clientWidth + 2;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
    setShowScrollHint(overflow && !atEnd);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollHint();
    const observer = new ResizeObserver(updateScrollHint);
    observer.observe(el);
    el.addEventListener('scroll', updateScrollHint, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', updateScrollHint);
    };
  }, [updateScrollHint]);

  return (
    <div className={cn('relative', className)}>
      <div
        ref={scrollRef}
        className="overflow-x-auto rounded-card border border-border [-webkit-overflow-scrolling:touch]"
        tabIndex={0}
        data-testid="methodology-table-scroll"
      >
        {children}
      </div>
      {showScrollHint && (
        <>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-12 rounded-r-card bg-gradient-to-l from-bg via-bg/80 to-transparent"
            aria-hidden
          />
          <p className="mt-2 text-xs text-ink-3" data-testid="methodology-table-scroll-hint">
            Scroll sideways for all metric columns
          </p>
        </>
      )}
    </div>
  );
}
