import { useEffect } from 'react';

/** Call handler when Escape is pressed while `enabled`. */
export function useOnEscape(handler: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handler();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handler, enabled]);
}
