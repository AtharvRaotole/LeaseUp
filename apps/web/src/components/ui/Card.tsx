import { cn } from '../../lib/cn';

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
}) {
  return (
    <div className={cn('rounded-card border border-border bg-surface p-5 md:p-6', className)} {...props}>
      {children}
    </div>
  );
}
