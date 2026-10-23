import type { PipelineColumn } from '@leaseup/contracts';

const COLUMN_LABELS: Record<PipelineColumn, string> = {
  to_pitch: 'To pitch',
  contacted: 'Contacted',
  touring: 'Touring',
  loi: 'LOI',
  signed: 'Signed',
  passed: 'Passed',
};

export function pipelineColumnLabel(column: PipelineColumn): string {
  return COLUMN_LABELS[column];
}
