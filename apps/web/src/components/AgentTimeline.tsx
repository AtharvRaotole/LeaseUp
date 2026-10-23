import { motion } from 'framer-motion';
import type { AnalysisStep } from '@leaseup/contracts';

const ORDER = ['locate', 'taste', 'backtest', 'prospects', 'verify', 'outreach_ready'] as const;

interface AgentTimelineProps {
  steps: AnalysisStep[];
}

export function AgentTimeline({ steps }: AgentTimelineProps) {
  const byId = new Map(steps.map((s) => [s.id, s]));

  return (
    <ol className="space-y-3">
      {ORDER.map((id) => {
        const step = byId.get(id);
        const status = step?.status ?? 'pending';
        return (
          <motion.li
            key={id}
            layout
            className="glass rounded-xl p-4 flex gap-4 items-start"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <StatusDot status={status} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-zinc-100">{step?.label ?? id}</p>
              {step?.summary && (
                <p className="text-sm text-zinc-400 mt-1">{step.summary}</p>
              )}
              {step?.durationMs !== undefined && status === 'complete' && (
                <p className="text-xs text-zinc-500 mt-1">{step.durationMs}ms</p>
              )}
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}

function StatusDot({ status }: { status: AnalysisStep['status'] }) {
  const color =
    status === 'complete'
      ? 'bg-emerald-500'
      : status === 'running'
        ? 'bg-accent animate-pulse'
        : status === 'error'
          ? 'bg-red-500'
          : 'bg-zinc-600';

  return <span className={`mt-1 h-3 w-3 rounded-full shrink-0 ${color}`} />;
}
