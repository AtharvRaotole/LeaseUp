import { forwardRef } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent',
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
        'inline-flex items-center justify-center gap-2 rounded-control font-medium transition-opacity duration-150 disabled:opacity-50',
        sizes[size],
        variants[variant],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = 'Button';
