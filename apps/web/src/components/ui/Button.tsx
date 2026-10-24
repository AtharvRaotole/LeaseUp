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
  primary: 'bg-accent text-on-accent hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent',
  secondary:
    'bg-surface-2 text-ink border border-border hover:border-border-strong focus-visible:ring-2 focus-visible:ring-accent',
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
