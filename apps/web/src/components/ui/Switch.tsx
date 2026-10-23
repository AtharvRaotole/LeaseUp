import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '../../lib/cn';

export function Switch({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-2">
      <SwitchPrimitive.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={cn(
          'relative h-5 w-9 rounded-pill border border-border bg-surface-2 data-[state=checked]:bg-accent data-[state=checked]:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'
        )}
      >
        <SwitchPrimitive.Thumb
          className="block h-4 w-4 translate-x-0.5 rounded-full bg-surface transition-transform data-[state=checked]:translate-x-[18px]"
        />
      </SwitchPrimitive.Root>
      <span>{label}</span>
    </label>
  );
}
