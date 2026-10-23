import { useMemo, useState } from 'react';
import type { PipelineCard, PipelineColumn } from '@leaseup/contracts';
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
import { PIPELINE_COLUMNS, columnLabel } from '../../lib/pipeline-columns';
import { PipelineCardItem } from './PipelineCardItem';
import { PipelineCardDialog } from './PipelineCardDialog';
import { updatePipelineCard } from '../../lib/pipeline-api';
import { cn } from '../../lib/cn';

function ColumnShell({
  column,
  cards,
  readOnly,
  onOpen,
}: {
  column: PipelineColumn;
  cards: PipelineCard[];
  readOnly?: boolean;
  onOpen: (c: PipelineCard) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column, disabled: readOnly });
  const ids = cards.map((c) => c.id);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex w-[min(100%,280px)] shrink-0 flex-col rounded-card border border-border bg-surface-2/40',
        isOver && 'ring-2 ring-accent/40'
      )}
      data-testid={`pipeline-column-${column}`}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h3 className="text-sm font-semibold text-ink">{columnLabel(column)}</h3>
        <span className="rounded-pill bg-surface px-2 py-0.5 font-mono text-xs text-ink-3">
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

function findColumnForId(
  cards: PipelineCard[],
  id: string
): PipelineColumn | null {
  if (PIPELINE_COLUMNS.some((c) => c.id === id)) return id as PipelineColumn;
  const card = cards.find((c) => c.id === id);
  return card?.column ?? null;
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

  const byColumn = useMemo(() => {
    const map = new Map<PipelineColumn, PipelineCard[]>();
    for (const col of PIPELINE_COLUMNS) map.set(col.id, []);
    for (const card of cards) {
      const list = map.get(card.column) ?? [];
      list.push(card);
      map.set(card.column, list);
    }
    for (const col of PIPELINE_COLUMNS) {
      map.get(col.id)?.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return map;
  }, [cards]);

  const activeCard = activeId ? cards.find((c) => c.id === activeId) : null;

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    if (readOnly) return;
    const { active, over } = event;
    if (!over) return;

    const cardId = String(active.id);
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;

    const overColumn = findColumnForId(cards, String(over.id));
    if (!overColumn) return;

    const destCards = (byColumn.get(overColumn) ?? []).filter((c) => c.id !== cardId);
    const overIsCard = cards.some((c) => c.id === over.id);
    let sortOrder = destCards.length;
    if (overIsCard) {
      const overCard = cards.find((c) => c.id === over.id);
      if (overCard && overCard.column === overColumn) {
        sortOrder = overCard.sortOrder;
      }
    }

    if (card.column === overColumn && card.sortOrder === sortOrder) return;

    await updatePipelineCard(cardId, { column: overColumn, sortOrder });
    onBoardUpdated();
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const openCard = (c: PipelineCard) => setDialogCard(c);
  const dialogOpen = !!dialogCard;
  const dialogCardLive = dialogCard ? cards.find((c) => c.id === dialogCard.id) ?? dialogCard : null;

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={(e) => void handleDragEnd(e)}
      >
        <div
          className="flex gap-3 overflow-x-auto pb-4"
          data-testid="pipeline-board"
        >
          {PIPELINE_COLUMNS.map((col) => (
            <ColumnShell
              key={col.id}
              column={col.id}
              cards={byColumn.get(col.id) ?? []}
              readOnly={readOnly}
              onOpen={openCard}
            />
          ))}
        </div>
        <DragOverlay>
          {activeCard ? (
            <div className="w-[260px] opacity-95">
              <PipelineCardItem card={activeCard} readOnly onOpen={() => undefined} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <PipelineCardDialog
        card={dialogCardLive}
        readOnly={readOnly}
        open={dialogOpen}
        onOpenChange={(o) => !o && setDialogCard(null)}
        onBoardUpdated={onBoardUpdated}
      />
    </>
  );
}
