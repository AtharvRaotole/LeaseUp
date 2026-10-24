import type { ProspectFunnel } from '@leaseup/contracts';
import { prospectFunnelPlainLine } from '../../lib/prospect-funnel-copy';

export function ReportProspectFunnel({ funnel }: { funnel: ProspectFunnel }) {
  return (
    <p
      className="text-sm text-ink-2"
      data-testid="report-prospect-funnel"
    >
      {prospectFunnelPlainLine(funnel)}
    </p>
  );
}
