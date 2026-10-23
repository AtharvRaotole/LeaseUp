import type { PipelineColumn } from '@leaseup/contracts';

export const PIPELINE_COLUMNS: { id: PipelineColumn; label: string }[] = [
  { id: 'to_pitch', label: 'To pitch' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'touring', label: 'Touring' },
  { id: 'loi', label: 'LOI' },
  { id: 'signed', label: 'Signed' },
  { id: 'passed', label: 'Passed' },
];

export function nextColumn(column: PipelineColumn): PipelineColumn | null {
  const idx = PIPELINE_COLUMNS.findIndex((c) => c.id === column);
  if (idx < 0 || idx >= PIPELINE_COLUMNS.length - 1) return null;
  return PIPELINE_COLUMNS[idx + 1]!.id;
}

export function prevColumn(column: PipelineColumn): PipelineColumn | null {
  const idx = PIPELINE_COLUMNS.findIndex((c) => c.id === column);
  if (idx <= 0) return null;
  return PIPELINE_COLUMNS[idx - 1]!.id;
}

export function columnLabel(column: PipelineColumn): string {
  return PIPELINE_COLUMNS.find((c) => c.id === column)?.label ?? column;
}
