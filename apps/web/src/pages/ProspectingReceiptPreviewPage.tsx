import { TopBar } from '../components/layout/TopBar';
import { PreviewSampleBanner } from '../components/layout/PreviewSampleBanner';
import { AgentReceipt } from '../components/prospecting/AgentReceipt';
import { DEMO_PROSPECTING_RECEIPT_JOB } from '../lib/demo-prospecting-receipt-fixture';

/** Static route for agent receipt screenshots (no API). */
export function ProspectingReceiptPreviewPage() {
  const job = DEMO_PROSPECTING_RECEIPT_JOB;
  return (
    <div className="min-h-screen bg-bg">
      <TopBar />
      <main className="mx-auto max-w-[720px] px-4 py-10" data-testid="prospecting-page">
        <PreviewSampleBanner />
        <h1 className="mt-4 font-display font-semibold text-display text-ink">Full prospecting run</h1>
        <p className="mt-2 text-ink-2">Run complete. Review the agent receipt below.</p>
        <AgentReceipt job={job} />
      </main>
    </div>
  );
}
