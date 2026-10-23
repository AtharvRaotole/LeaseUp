import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '../../lib/cn';

export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled,
  title,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <label
      className={cn(
        'grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0 text-sm text-ink-2',
        disabled && 'cursor-not-allowed'
      )}
      title={title}
    >
      <span className={disabled ? 'text-ink-3' : undefined}>{label}</span>
      <SwitchPrimitive.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-pill border border-border bg-surface-2 data-[state=checked]:bg-accent data-[state=checked]:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          disabled && 'opacity-40'
        )}
      >
        <SwitchPrimitive.Thumb
          className="block h-4 w-4 translate-x-0.5 rounded-full bg-surface transition-transform data-[state=checked]:translate-x-[18px]"
        />
      </SwitchPrimitive.Root>
    </label>
  );
}
