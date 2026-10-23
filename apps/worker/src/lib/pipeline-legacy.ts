import type { PipelineCard, PipelineColumn, PipelineProspectStatus } from '@leaseup/contracts';
import { PipelineCardSchema } from '@leaseup/contracts';

type LegacyCard = {
  prospectStatus?: PipelineProspectStatus;
  column?: PipelineColumn;
  outreachStatus?: 'none' | 'drafted' | 'sent' | 'replied';
  id: string;
  sortOrder: number;
  brandEntityId: string;
  brandName: string;
  propertyAddress: string;
  propertyNeighborhood?: string;
  affinityRank: number;
  verification: string;
  pitchId?: string;
  pitchLink?: string;
  reportPath?: string;
  notes: string;
  recipientEmail?: string;
  lastTouchedAt: string;
  followUpAt?: string;
  outreachContext?: PipelineCard['outreachContext'];
  outreachDraft?: PipelineCard['outreachDraft'];
};

export function legacyProspectStatus(card: LegacyCard): PipelineProspectStatus {
  if (card.prospectStatus) return card.prospectStatus;

  const outreach = card.outreachStatus ?? 'none';
  const column = card.column ?? 'to_pitch';

  if (outreach === 'drafted') return 'drafted';
  if (outreach === 'sent') return 'sent_by_me';
  if (outreach === 'replied') return 'replied';

  switch (column) {
    case 'to_pitch':
      return 'to_pitch';
    case 'contacted':
      return 'to_pitch';
    case 'touring':
      return 'touring';
    case 'loi':
    case 'signed':
      return 'loi';
    case 'passed':
      return 'passed';
    default:
      return 'to_pitch';
  }
}

export function normalizePipelineCard(raw: unknown): PipelineCard {
  const parsed = PipelineCardSchema.safeParse(raw);
  if (parsed.success) return parsed.data;

  const legacy = raw as LegacyCard;
  const { column: _c, outreachStatus: _o, ...rest } = legacy;
  return PipelineCardSchema.parse({
    ...rest,
    prospectStatus: legacyProspectStatus(legacy),
  });
}
