import { randomUUID } from 'node:crypto';
import type {
  PipelineAddCard,
  PipelineBoard,
  PipelineCard,
  PipelineProspectStatus,
  PipelinePublicBoard,
  PipelineUpdateCard,
} from '@leaseup/contracts';
import {
  PipelineBoardSchema,
  PipelineCardSchema,
  PipelinePublicBoardSchema,
} from '@leaseup/contracts';
import type { Env } from '../index';
import { OpenAIClient } from '../providers/openai';
import {
  insertPipelineCard,
  listPipelineCards,
  migrateLegacyCardsToTable,
  updatePipelineCardRow,
} from '../lib/pipeline-cards-db';
import { findWatchIdForProperty } from '../lib/pipeline-watch-alerts';
import { normalizePipelineCard } from '../lib/pipeline-legacy';
import {
  PIPELINE_STATUS_ORDER,
  pipelineProspectStatusLabel,
} from '../lib/pipeline-status-labels';

export { PIPELINE_STATUS_ORDER };

type BoardPayload = {
  workspaceId: string;
  shareId: string;
  createdAt: string;
  updatedAt: string;
  cards?: PipelineCard[];
};

function emptyBoard(workspaceId: string, shareId: string): PipelineBoard {
  const now = new Date().toISOString();
  return {
    workspaceId,
    shareId,
    cards: [],
    createdAt: now,
    updatedAt: now,
  };
}

function nextSortOrder(cards: PipelineCard[], status: PipelineProspectStatus): number {
  const inCol = cards.filter((c) => c.prospectStatus === status);
  if (inCol.length === 0) return 0;
  return Math.max(...inCol.map((c) => c.sortOrder)) + 1;
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function boardPayload(board: PipelineBoard): BoardPayload {
  return {
    workspaceId: board.workspaceId,
    shareId: board.shareId,
    createdAt: board.createdAt,
    updatedAt: board.updatedAt,
  };
}

export class PipelineService {
  private db: D1Database;

  constructor(env: Env) {
    this.db = env.DB;
  }

  private async loadCards(workspaceId: string, legacyPayload?: BoardPayload): Promise<PipelineCard[]> {
    const rows = await listPipelineCards(this.db, workspaceId);
    if (rows.length > 0) return rows;

    const legacy = legacyPayload?.cards;
    if (legacy?.length) {
      const normalized = legacy.map((c) => normalizePipelineCard(c));
      await migrateLegacyCardsToTable(this.db, workspaceId, normalized);
      return await listPipelineCards(this.db, workspaceId);
    }
    return [];
  }

  private async assembleBoard(payload: BoardPayload): Promise<PipelineBoard> {
    const cards = await this.loadCards(payload.workspaceId, payload);
    const board: PipelineBoard = {
      workspaceId: payload.workspaceId,
      shareId: payload.shareId,
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt,
      cards,
    };
    return PipelineBoardSchema.parse(board);
  }

  async getOrCreate(workspaceId: string): Promise<PipelineBoard> {
    const existing = await this.getByWorkspace(workspaceId);
    if (existing) return existing;

    const shareId = randomUUID();
    const board = emptyBoard(workspaceId, shareId);
    PipelineBoardSchema.parse(board);
    await this.db
      .prepare('INSERT INTO pipeline_boards (workspace_id, share_id, payload) VALUES (?, ?, ?)')
      .bind(workspaceId, shareId, JSON.stringify(boardPayload(board)))
      .run();
    return board;
  }

  async getByWorkspace(workspaceId: string): Promise<PipelineBoard | null> {
    const row = await this.db
      .prepare('SELECT payload FROM pipeline_boards WHERE workspace_id = ?')
      .bind(workspaceId)
      .first<{ payload: string }>();
    if (!row?.payload) return null;
    const payload = JSON.parse(row.payload) as BoardPayload;
    return this.assembleBoard(payload);
  }

  async getPublic(shareId: string): Promise<PipelinePublicBoard | null> {
    const row = await this.db
      .prepare('SELECT payload FROM pipeline_boards WHERE share_id = ?')
      .bind(shareId)
      .first<{ payload: string }>();
    if (!row?.payload) return null;
    const payload = JSON.parse(row.payload) as BoardPayload;
    const board = await this.assembleBoard(payload);
    const publicBoard: PipelinePublicBoard = {
      shareId: board.shareId,
      cards: board.cards.map((c) => ({
        ...c,
        recipientEmail: undefined,
        outreachDraft: undefined,
        outreachContext: undefined,
      })),
      updatedAt: board.updatedAt,
      readOnly: true,
    };
    return PipelinePublicBoardSchema.parse(publicBoard);
  }

  private async saveMeta(board: PipelineBoard): Promise<PipelineBoard> {
    board.updatedAt = new Date().toISOString();
    PipelineBoardSchema.parse(board);
    await this.db
      .prepare('UPDATE pipeline_boards SET payload = ?, updated_at = unixepoch() WHERE workspace_id = ?')
      .bind(JSON.stringify(boardPayload(board)), board.workspaceId)
      .run();
    return board;
  }

  async addCard(workspaceId: string, input: PipelineAddCard): Promise<PipelineBoard> {
    const board = await this.getOrCreate(workspaceId);
    const now = new Date().toISOString();
    const watchId =
      input.radiusKm !== undefined
        ? await findWatchIdForProperty(
            this.db,
            workspaceId,
            input.propertyAddress,
            input.radiusKm
          )
        : undefined;

    const existingIdx = board.cards.findIndex(
      (c) =>
        c.brandEntityId === input.brandEntityId &&
        c.propertyAddress.trim().toLowerCase() === input.propertyAddress.trim().toLowerCase()
    );

    if (existingIdx >= 0) {
      const card = board.cards[existingIdx]!;
      card.evidenceSnapshot = input.evidenceSnapshot ?? card.evidenceSnapshot;
      card.reportPath = input.reportPath ?? card.reportPath;
      card.pitchId = input.pitchId ?? card.pitchId;
      card.pitchLink = input.pitchLink ?? card.pitchLink;
      card.watchId = watchId ?? card.watchId;
      card.lastTouchedAt = now;
      board.cards[existingIdx] = PipelineCardSchema.parse(card);
      await updatePipelineCardRow(this.db, workspaceId, board.cards[existingIdx]);
      return this.saveMeta(board);
    }

    const card: PipelineCard = {
      id: randomUUID(),
      prospectStatus: 'to_pitch',
      sortOrder: nextSortOrder(board.cards, 'to_pitch'),
      brandEntityId: input.brandEntityId,
      brandName: input.brandName,
      propertyAddress: input.propertyAddress,
      propertyNeighborhood: input.propertyNeighborhood,
      affinityRank: input.affinityRank,
      verification: input.verification,
      pitchId: input.pitchId,
      pitchLink: input.pitchLink,
      reportPath: input.reportPath,
      notes: '',
      lastTouchedAt: now,
      outreachContext: input.outreachContext,
      evidenceSnapshot: input.evidenceSnapshot,
      watchId,
    };
    PipelineCardSchema.parse(card);
    await insertPipelineCard(this.db, workspaceId, card);
    board.cards.push(card);
    return this.saveMeta(board);
  }

  async attachPitchLink(
    workspaceId: string,
    input: {
      pitchId: string;
      pitchLink: string;
      propertyAddress: string;
      brandEntityIds: string[];
    }
  ): Promise<PipelineBoard> {
    const board = await this.getOrCreate(workspaceId);
    const normalized = input.propertyAddress.trim().toLowerCase();
    const idSet = new Set(input.brandEntityIds);
    const now = new Date().toISOString();
    let touched = false;

    for (let i = 0; i < board.cards.length; i++) {
      const card = board.cards[i]!;
      if (card.propertyAddress.trim().toLowerCase() !== normalized) continue;
      if (!idSet.has(card.brandEntityId)) continue;
      card.pitchId = input.pitchId;
      card.pitchLink = input.pitchLink;
      card.lastTouchedAt = now;
      const parsed = PipelineCardSchema.parse(card);
      board.cards[i] = parsed;
      await updatePipelineCardRow(this.db, workspaceId, parsed);
      touched = true;
    }

    if (!touched) return board;
    return this.saveMeta(board);
  }

  async updateCard(
    workspaceId: string,
    cardId: string,
    patch: PipelineUpdateCard
  ): Promise<PipelineBoard> {
    const board = await this.getOrCreate(workspaceId);
    const idx = board.cards.findIndex((c) => c.id === cardId);
    if (idx < 0) {
      throw new Error('Card not found');
    }
    const card = board.cards[idx]!;
    const now = new Date().toISOString();

    if (patch.prospectStatus !== undefined) {
      card.prospectStatus = patch.prospectStatus;
      if (patch.sortOrder === undefined) {
        card.sortOrder = nextSortOrder(
          board.cards.filter((c) => c.id !== cardId),
          patch.prospectStatus
        );
      }
    }
    if (patch.sortOrder !== undefined) card.sortOrder = patch.sortOrder;
    if (patch.notes !== undefined) card.notes = patch.notes;
    if (patch.recipientEmail !== undefined) card.recipientEmail = patch.recipientEmail || undefined;
    if (patch.followUpAt !== undefined) {
      card.followUpAt = patch.followUpAt ?? undefined;
    }
    if (patch.outreachDraft !== undefined) {
      card.outreachDraft = patch.outreachDraft ?? undefined;
    }
    if (patch.pitchId !== undefined) card.pitchId = patch.pitchId;
    if (patch.pitchLink !== undefined) card.pitchLink = patch.pitchLink;
    if (patch.tradeAreaAlert !== undefined) {
      card.tradeAreaAlert = patch.tradeAreaAlert ?? undefined;
    }
    card.lastTouchedAt = now;
    board.cards[idx] = PipelineCardSchema.parse(card);
    await updatePipelineCardRow(this.db, workspaceId, board.cards[idx]);
    return this.saveMeta(board);
  }

  async generateOutreach(env: Env, workspaceId: string, cardId: string): Promise<PipelineBoard> {
    const board = await this.getOrCreate(workspaceId);
    const card = board.cards.find((c) => c.id === cardId);
    if (!card) throw new Error('Card not found');

    const ctx = card.outreachContext ?? { reasons: [] };
    const openai = new OpenAIClient(env);
    const draft = await openai.generateOutreach({
      brandName: card.brandName,
      address: card.propertyAddress,
      reasons: ctx.reasons,
      runId: ctx.runId,
      affinityRank: card.affinityRank,
      neighborhood: card.propertyNeighborhood ?? ctx.neighborhood,
      nearestStoreKm: ctx.nearestStoreKm,
      coTenantBrands: ctx.coTenantBrands,
      verificationLabel: ctx.verificationLabel ?? card.verification,
    });

    card.outreachDraft = {
      subject: draft.subject,
      body: draft.body,
      model: draft.model,
    };
    card.lastTouchedAt = new Date().toISOString();
    await updatePipelineCardRow(this.db, workspaceId, PipelineCardSchema.parse(card));
    return this.saveMeta(board);
  }

  exportCsv(board: PipelineBoard): string {
    const headers = [
      'brand',
      'property',
      'neighborhood',
      'status',
      'rank',
      'verification',
      'recipient',
      'next_step_reminder',
      'last_touched',
      'pitch_link',
      'report_path',
      'notes',
    ];
    const rows = board.cards
      .slice()
      .sort((a, b) => {
        const colA = PIPELINE_STATUS_ORDER.indexOf(a.prospectStatus);
        const colB = PIPELINE_STATUS_ORDER.indexOf(b.prospectStatus);
        if (colA !== colB) return colA - colB;
        return a.sortOrder - b.sortOrder;
      })
      .map((c) =>
        [
          c.brandName,
          c.propertyAddress,
          c.propertyNeighborhood ?? '',
          pipelineProspectStatusLabel(c.prospectStatus),
          String(c.affinityRank),
          c.verification,
          c.recipientEmail ?? '',
          c.followUpAt ?? '',
          c.lastTouchedAt,
          c.pitchLink ?? '',
          c.reportPath ?? '',
          c.notes,
        ].map(escapeCsv).join(',')
      );
    return `${headers.join(',')}\n${rows.join('\n')}\n`;
  }
}
