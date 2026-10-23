import type { PipelineProspectStatus } from '@leaseup/contracts';

export const PIPELINE_STATUSES: { id: PipelineProspectStatus; label: string }[] = [
  { id: 'to_pitch', label: 'To pitch' },
  { id: 'drafted', label: 'Drafted' },
  { id: 'sent_by_me', label: 'Sent by me' },
  { id: 'replied', label: 'Replied' },
  { id: 'touring', label: 'Touring' },
  { id: 'loi', label: 'LOI' },
  { id: 'passed', label: 'Passed' },
];

export function nextProspectStatus(
  status: PipelineProspectStatus
): PipelineProspectStatus | null {
  const idx = PIPELINE_STATUSES.findIndex((s) => s.id === status);
  if (idx < 0 || idx >= PIPELINE_STATUSES.length - 1) return null;
  return PIPELINE_STATUSES[idx + 1]!.id;
}

export function prevProspectStatus(
  status: PipelineProspectStatus
): PipelineProspectStatus | null {
  const idx = PIPELINE_STATUSES.findIndex((s) => s.id === status);
  if (idx <= 0) return null;
  return PIPELINE_STATUSES[idx - 1]!.id;
}

export function prospectStatusLabel(status: PipelineProspectStatus): string {
  return PIPELINE_STATUSES.find((s) => s.id === status)?.label ?? status;
}
