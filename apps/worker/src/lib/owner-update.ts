import { randomUUID } from 'node:crypto';
import type { OwnerUpdateSnapshot, PipelineBoard, PipelineCard } from '@leaseup/contracts';
import { pipelineColumnLabel } from './pipeline-export-labels';

const COLUMN_NEXT: Record<string, string> = {
  to_pitch: 'Draft outreach and confirm the right real estate contact.',
  contacted: 'Log replies and schedule a site tour if interest is warm.',
  touring: 'Share floor plans and co-tenancy after the walkthrough.',
  loi: 'Track LOI edits with the landlord and tenant counsel.',
  signed: 'Hand off to lease execution and opening timeline.',
  passed: 'Note why this brand passed so the owner sees the full story.',
};

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
    column: card.column,
    columnLabel: pipelineColumnLabel(card.column),
    outreachStatus: card.outreachStatus,
    followUpAt: card.followUpAt,
    lastTouchedAt: card.lastTouchedAt,
    notes: card.notes.trim() ? card.notes.trim() : undefined,
    nextStep: COLUMN_NEXT[card.column] ?? 'Update the card stage when something changes.',
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
