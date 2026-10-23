import { randomUUID } from 'node:crypto';
import type {
  PipelineAddCard,
  PipelineBoard,
  PipelineCard,
  PipelineColumn,
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
import { pipelineColumnLabel } from '../lib/pipeline-export-labels';

const COLUMN_ORDER: PipelineColumn[] = [
  'to_pitch',
  'contacted',
  'touring',
  'loi',
  'signed',
  'passed',
];

export { COLUMN_ORDER };

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

function nextSortOrder(cards: PipelineCard[], column: PipelineColumn): number {
  const inCol = cards.filter((c) => c.column === column);
  if (inCol.length === 0) return 0;
  return Math.max(...inCol.map((c) => c.sortOrder)) + 1;
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export class PipelineService {
  private db: D1Database;

  constructor(env: Env) {
    this.db = env.DB;
  }

  async getOrCreate(workspaceId: string): Promise<PipelineBoard> {
    const existing = await this.getByWorkspace(workspaceId);
    if (existing) return existing;

    const shareId = randomUUID();
    const board = emptyBoard(workspaceId, shareId);
    PipelineBoardSchema.parse(board);
    await this.db
      .prepare('INSERT INTO pipeline_boards (workspace_id, share_id, payload) VALUES (?, ?, ?)')
      .bind(workspaceId, shareId, JSON.stringify(board))
      .run();
    return board;
  }

  async getByWorkspace(workspaceId: string): Promise<PipelineBoard | null> {
    const row = await this.db
      .prepare('SELECT payload FROM pipeline_boards WHERE workspace_id = ?')
      .bind(workspaceId)
      .first<{ payload: string }>();
    if (!row?.payload) return null;
    return PipelineBoardSchema.parse(JSON.parse(row.payload));
  }

  async getPublic(shareId: string): Promise<PipelinePublicBoard | null> {
    const row = await this.db
      .prepare('SELECT payload FROM pipeline_boards WHERE share_id = ?')
      .bind(shareId)
      .first<{ payload: string }>();
    if (!row?.payload) return null;
    const board = PipelineBoardSchema.parse(JSON.parse(row.payload));
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

  private async save(board: PipelineBoard): Promise<PipelineBoard> {
    board.updatedAt = new Date().toISOString();
    PipelineBoardSchema.parse(board);
    await this.db
      .prepare('UPDATE pipeline_boards SET payload = ?, updated_at = unixepoch() WHERE workspace_id = ?')
      .bind(JSON.stringify(board), board.workspaceId)
      .run();
    return board;
  }

  async addCard(workspaceId: string, input: PipelineAddCard): Promise<PipelineBoard> {
    const board = await this.getOrCreate(workspaceId);
    const now = new Date().toISOString();
    const card: PipelineCard = {
      id: randomUUID(),
      column: 'to_pitch',
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
    };
    PipelineCardSchema.parse(card);
    board.cards.push(card);
    return this.save(board);
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

    if (patch.column !== undefined) {
      card.column = patch.column;
      if (patch.sortOrder === undefined) {
        card.sortOrder = nextSortOrder(
          board.cards.filter((c) => c.id !== cardId),
          patch.column
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
    card.lastTouchedAt = now;
    board.cards[idx] = PipelineCardSchema.parse(card);
    return this.save(board);
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
    });

    card.outreachDraft = {
      subject: draft.subject,
      body: draft.body,
      model: draft.model,
    };
    card.lastTouchedAt = new Date().toISOString();
    return this.save(board);
  }

  exportCsv(board: PipelineBoard): string {
    const headers = [
      'brand',
      'property',
      'neighborhood',
      'column',
      'rank',
      'verification',
      'recipient',
      'follow_up',
      'last_touched',
      'pitch_link',
      'report_path',
      'notes',
    ];
    const rows = board.cards
      .slice()
      .sort((a, b) => {
        const colA = COLUMN_ORDER.indexOf(a.column);
        const colB = COLUMN_ORDER.indexOf(b.column);
        if (colA !== colB) return colA - colB;
        return a.sortOrder - b.sortOrder;
      })
      .map((c) =>
        [
          c.brandName,
          c.propertyAddress,
          c.propertyNeighborhood ?? '',
          pipelineColumnLabel(c.column),
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
