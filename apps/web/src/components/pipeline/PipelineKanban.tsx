import { useMemo, useState } from 'react';
import type { PipelineCard, PipelineProspectStatus } from '@leaseup/contracts';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { PIPELINE_STATUSES, prospectStatusLabel } from '../../lib/pipeline-status';
import { PipelineCardItem } from './PipelineCardItem';
import { PipelineCardDialog } from './PipelineCardDialog';
import { updatePipelineCard } from '../../lib/pipeline-api';
import { cn } from '../../lib/cn';

function ColumnShell({
  status,
  cards,
  readOnly,
  onOpen,
}: {
  status: PipelineProspectStatus;
  cards: PipelineCard[];
  readOnly?: boolean;
  onOpen: (c: PipelineCard) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status, disabled: readOnly });
  const ids = cards.map((c) => c.id);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-[min(100%,240px)] shrink-0 flex-col rounded-card border border-border bg-surface-2/40',
        isOver && 'ring-2 ring-accent/40'
      )}
      data-testid={`pipeline-column-${status}`}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h3 className="text-sm font-semibold text-ink">{prospectStatusLabel(status)}</h3>
        <span className="rounded-pill bg-surface px-2 py-0.5 text-xs text-ink-3">
          {cards.length}
        </span>
      </div>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className="flex min-h-[120px] flex-1 flex-col gap-2 p-2">
          {cards.map((card) => (
            <li key={card.id}>
              <PipelineCardItem card={card} readOnly={readOnly} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      </SortableContext>
    </div>
  );
}

function findStatusForId(
  cards: PipelineCard[],
  id: string
): PipelineProspectStatus | null {
  if (PIPELINE_STATUSES.some((c) => c.id === id)) return id as PipelineProspectStatus;
  const card = cards.find((c) => c.id === id);
  return card?.prospectStatus ?? null;
}

export function PipelineKanban({
  cards,
  readOnly,
  onBoardUpdated,
}: {
  cards: PipelineCard[];
  readOnly?: boolean;
  onBoardUpdated: () => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dialogCard, setDialogCard] = useState<PipelineCard | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const byStatus = useMemo(() => {
    const map = new Map<PipelineProspectStatus, PipelineCard[]>();
    for (const col of PIPELINE_STATUSES) map.set(col.id, []);
    for (const card of cards) {
      const list = map.get(card.prospectStatus) ?? [];
      list.push(card);
      map.set(card.prospectStatus, list);
    }
    for (const col of PIPELINE_STATUSES) {
      map.get(col.id)?.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return map;
  }, [cards]);

  const activeCard = activeId ? cards.find((c) => c.id === activeId) : null;

  const onDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    if (readOnly) return;
    const { active, over } = event;
    if (!over) return;

    const card = cards.find((c) => c.id === active.id);
    if (!card) return;

    const overStatus = findStatusForId(cards, String(over.id));
    if (!overStatus) return;

    let sortOrder = 0;
    const overCard = cards.find((c) => c.id === over.id);
    if (overCard && overCard.prospectStatus === overStatus) {
      sortOrder = overCard.sortOrder;
    } else {
      sortOrder = (byStatus.get(overStatus)?.length ?? 0);
    }

    if (card.prospectStatus === overStatus && card.sortOrder === sortOrder) return;

    await updatePipelineCard(card.id, {
      prospectStatus: overStatus,
      sortOrder,
    });
    onBoardUpdated();
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
        onDragEnd={(e) => void onDragEnd(e)}
      >
        <div
          className="mt-6 flex gap-3 overflow-x-auto pb-2"
          data-testid="pipeline-board"
        >
          {PIPELINE_STATUSES.map((col) => (
            <ColumnShell
              key={col.id}
              status={col.id}
              cards={byStatus.get(col.id) ?? []}
              readOnly={readOnly}
              onOpen={setDialogCard}
            />
          ))}
        </div>
        <DragOverlay>
          {activeCard ? (
            <PipelineCardItem card={activeCard} readOnly onOpen={() => {}} />
          ) : null}
        </DragOverlay>
      </DndContext>

      <PipelineCardDialog
        card={dialogCard}
        readOnly={readOnly}
        open={!!dialogCard}
        onOpenChange={(o) => !o && setDialogCard(null)}
        onBoardUpdated={onBoardUpdated}
      />
    </>
  );
}
