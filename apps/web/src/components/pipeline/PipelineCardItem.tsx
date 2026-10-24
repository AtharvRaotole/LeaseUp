import { useMemo } from 'react';
import type { PipelineCard } from '@leaseup/contracts';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '../../lib/cn';
import { brandMonogram, brandTint } from '../../lib/brand-monogram';
import { formatUserFacingDate } from '../../lib/format-date';

function isOverdue(followUpAt?: string): boolean {
  if (!followUpAt) return false;
  const day = followUpAt.slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  return day < today;
}

export function PipelineCardItem({
  card,
  readOnly,
  onOpen,
}: {
  card: PipelineCard;
  readOnly?: boolean;
  onOpen: (card: PipelineCard) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    disabled: readOnly,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const overdue = useMemo(() => isOverdue(card.followUpAt), [card.followUpAt]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-card border border-border bg-surface p-3 shadow-sm transition-shadow',
        isDragging && 'z-10 opacity-90 shadow-pop ring-2 ring-accent/30'
      )}
      data-testid="pipeline-card"
    >
      <div className="flex gap-2">
        {!readOnly && (
          <button
            type="button"
            ref={setActivatorNodeRef}
            className="mt-0.5 shrink-0 rounded-control p-1 text-ink-3 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label={`Move ${card.brandName}. Press Space to pick up, arrow keys to move column, Space to drop.`}
            data-testid="pipeline-card-drag-handle"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" aria-hidden />
          </button>
        )}
      <button
        type="button"
        className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-control"
        onClick={() => onOpen(card)}
        aria-label={`Open ${card.brandName} pipeline details`}
      >
        <div className="flex items-start gap-2">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-[10px] font-semibold text-ink"
            style={{ background: brandTint(card.brandName) }}
          >
            {brandMonogram(card.brandName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-ink">{card.brandName}</p>
            <p className="mt-0.5 line-clamp-2 text-xs text-ink-3">{card.propertyAddress}</p>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="rounded-pill bg-accent-soft px-2 py-0.5 font-medium text-accent-muted">
            Rank #{card.affinityRank}
          </span>
          <span className="rounded-pill border border-border px-2 py-0.5 text-ink-2">
            {card.verification}
          </span>
          {card.tradeAreaAlert && (
            <span
              className="rounded-pill bg-warn/15 px-2 py-0.5 font-medium text-warn"
              data-testid="pipeline-trade-area-alert"
            >
              Trade area update
            </span>
          )}
          {overdue && (
            <span
              className="rounded-pill bg-danger/10 px-2 py-0.5 font-medium text-danger"
              data-testid="pipeline-overdue"
            >
              Overdue
            </span>
          )}
        </div>
        <p className="mt-2 text-[11px] leading-snug text-ink-3">
          Updated {formatUserFacingDate(card.lastTouchedAt)}
          {card.followUpAt ? `. Reminder ${formatUserFacingDate(card.followUpAt)}` : ''}
        </p>
      </button>
      </div>
    </div>
  );
}
