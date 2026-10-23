import { randomUUID } from 'node:crypto';
import type { OwnerUpdateSnapshot, PipelineBoard, PipelineCard } from '@leaseup/contracts';
import {
  STATUS_NEXT_STEP,
  pipelineProspectStatusLabel,
} from './pipeline-status-labels';

export function cardsForProperty(board: PipelineBoard, propertyAddress: string): PipelineCard[] {
  const normalized = propertyAddress.trim().toLowerCase();
  return board.cards
    .filter((c) => c.propertyAddress.trim().toLowerCase() === normalized)
    .sort((a, b) => a.affinityRank - b.affinityRank);
}

export function buildOwnerUpdateSnapshot(
  board: PipelineBoard,
  propertyAddress: string
): OwnerUpdateSnapshot {
  const cards = cardsForProperty(board, propertyAddress);
  const propertyNeighborhood = cards.find((c) => c.propertyNeighborhood)?.propertyNeighborhood;
  const now = new Date().toISOString();

  const brands = cards.map((card) => ({
    brandEntityId: card.brandEntityId,
    brandName: card.brandName,
    prospectStatus: card.prospectStatus,
    prospectStatusLabel: pipelineProspectStatusLabel(card.prospectStatus),
    followUpAt: card.followUpAt,
    lastTouchedAt: card.lastTouchedAt,
    notes: card.notes.trim() ? card.notes.trim() : undefined,
    nextStep: STATUS_NEXT_STEP[card.prospectStatus] ?? 'Update the card when something changes.',
  }));

  return {
    id: randomUUID(),
    createdAt: now,
    propertyAddress: propertyAddress.trim(),
    propertyNeighborhood,
    brandsContacted: brands.length,
    brands,
    pipelineUpdatedAt: board.updatedAt,
  };
}

export function listOwnerUpdateProperties(board: PipelineBoard): string[] {
  const set = new Set<string>();
  for (const card of board.cards) {
    if (card.propertyAddress.trim()) set.add(card.propertyAddress.trim());
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}
