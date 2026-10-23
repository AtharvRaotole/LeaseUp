import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
export function Accordion({
  items,
}: {
  items: Array<{ id: string; title: string; content: React.ReactNode }>;
}) {
  return (
    <AccordionPrimitive.Root type="multiple" className="divide-y divide-border rounded-card border border-border bg-surface">
      {items.map((item) => (
        <AccordionPrimitive.Item key={item.id} value={item.id}>
          <AccordionPrimitive.Header>
            <AccordionPrimitive.Trigger
              className="flex w-full min-h-12 items-center justify-between px-5 py-3 text-left text-sm font-medium text-ink hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
            >
              {item.title}
              <ChevronDown className="h-4 w-4 text-ink-3 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
            </AccordionPrimitive.Trigger>
          </AccordionPrimitive.Header>
          <AccordionPrimitive.Content className="overflow-hidden px-5 pb-4 text-sm text-ink-2">
            {item.content}
          </AccordionPrimitive.Content>
        </AccordionPrimitive.Item>
      ))}
    </AccordionPrimitive.Root>
  );
}
