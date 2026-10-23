import { useMemo } from 'react';
import type { PipelineCard } from '@leaseup/contracts';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
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
        isDragging && 'z-10 opacity-90 shadow-pop ring-2 ring-accent/30',
        !readOnly && 'cursor-grab active:cursor-grabbing'
      )}
      data-testid="pipeline-card"
      {...attributes}
      {...listeners}
    >
      <button
        type="button"
        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-control"
        onClick={() => onOpen(card)}
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
          <span className="rounded-pill bg-accent-soft px-2 py-0.5 font-medium text-accent">
            Rank #{card.affinityRank}
          </span>
          <span className="rounded-pill border border-border px-2 py-0.5 text-ink-2">
            {card.verification}
          </span>
          {card.outreachStatus && card.outreachStatus !== 'none' && (
            <span className="rounded-pill border border-border px-2 py-0.5 text-ink-2 capitalize">
              {card.outreachStatus}
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
        <p className="mt-2 text-[11px] text-ink-3">
          Touched {formatUserFacingDate(card.lastTouchedAt)}
          {card.followUpAt ? ` · Follow-up ${formatUserFacingDate(card.followUpAt)}` : ''}
        </p>
      </button>
    </div>
  );
}
