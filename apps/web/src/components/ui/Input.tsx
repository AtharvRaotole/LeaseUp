import { forwardRef } from 'react';
import { cn } from '../../lib/cn';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full h-14 rounded-control border border-border bg-surface-2 px-4 text-body text-ink placeholder:text-ink-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-accent/50',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';
