import type { PipelineProspectStatus } from '@leaseup/contracts';

const STATUS_LABELS: Record<PipelineProspectStatus, string> = {
  to_pitch: 'To pitch',
  drafted: 'Drafted',
  sent_by_me: 'Sent by me',
  replied: 'Replied',
  touring: 'Touring',
  loi: 'LOI',
  passed: 'Passed',
};

export const PIPELINE_STATUS_ORDER: PipelineProspectStatus[] = [
  'to_pitch',
  'drafted',
  'sent_by_me',
  'replied',
  'touring',
  'loi',
  'passed',
];

export function pipelineProspectStatusLabel(status: PipelineProspectStatus): string {
  return STATUS_LABELS[status];
}

export const STATUS_NEXT_STEP: Record<PipelineProspectStatus, string> = {
  to_pitch: 'Pick a brand and draft outreach when you are ready.',
  drafted: 'Copy the draft and send it from your own email when you choose.',
  sent_by_me: 'Log replies and set a reminder if you are waiting on them.',
  replied: 'Schedule a tour or share floor plans if they want a visit.',
  touring: 'Share feedback with the landlord after the walkthrough.',
  loi: 'Track LOI edits with the landlord and tenant counsel.',
  passed: 'Note why this brand passed so you remember next time.',
};
