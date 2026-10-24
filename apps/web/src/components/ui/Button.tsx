import { forwardRef } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const sizes: Record<Size, string> = {
  sm: 'min-h-11 h-11 px-3 text-sm',
  md: 'min-h-11 h-11 px-4 text-sm',
  lg: 'min-h-12 h-12 px-5 text-base',
};

const variants: Record<Variant, string> = {
  primary:
    'border border-accent bg-accent text-on-accent hover:bg-[var(--accent-hover)] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg dark:border-accent/70 dark:bg-surface dark:text-ink dark:shadow-[0_0_20px_rgba(143,227,240,0.12)] dark:hover:border-accent dark:hover:bg-surface dark:hover:shadow-[0_0_28px_rgba(143,227,240,0.2)]',
  secondary:
    'bg-transparent text-ink-2 border border-border hover:border-border-strong hover:text-ink focus-visible:ring-2 focus-visible:ring-accent',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'ui-transition inline-flex items-center justify-center gap-2 rounded-control font-medium disabled:opacity-50 focus-visible:outline-none',
        sizes[size],
        variants[variant],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = 'Button';
