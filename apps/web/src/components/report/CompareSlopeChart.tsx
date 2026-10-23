import { useMemo, useState } from 'react';
import { Badge } from '../ui/Badge';

type Swing = {
  entityId: string;
  name: string;
  leftRank: number;
  rightRank: number;
  delta: number;
};

export function CompareSlopeChart({
  leftName,
  rightName,
  swings,
  recordedDemo,
}: {
  leftName: string;
  rightName: string;
  swings: Swing[];
  recordedDemo?: boolean;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const shortLeft = leftName.split(',')[0]?.trim() ?? leftName;
  const shortRight = rightName.split(',')[0]?.trim() ?? rightName;

  const layout = useMemo(() => {
    const maxRank = Math.max(...swings.flatMap((s) => [s.leftRank, s.rightRank]), 10);
    const pad = { t: 28, r: 88, b: 28, l: 88 };
    const w = 640;
    const h = 40 + swings.length * 36;
    const innerH = h - pad.t - pad.b;
    const yFor = (rank: number) => pad.t + ((rank - 1) / Math.max(1, maxRank - 1)) * innerH;
    const xL = pad.l;
    const xR = w - pad.r;
    return { w, h, pad, xL, xR, yFor, maxRank };
  }, [swings]);

  return (
    <section>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-h3 font-semibold text-ink">Same brands, different places.</h3>
        {recordedDemo && <Badge tone="warn">Recorded data</Badge>}
      </div>
      <p className="mt-2 text-sm text-ink-2">
        {shortLeft} vs {shortRight}. Same brands, very different appetite.
      </p>
      <div className="mt-4 overflow-x-auto rounded-card border border-border bg-surface p-4">
        <svg
          viewBox={`0 0 ${layout.w} ${layout.h}`}
          className="w-full min-w-[320px]"
          role="img"
          aria-label={`Rank comparison ${shortLeft} and ${shortRight}`}
        >
          <text x={layout.xL} y={16} textAnchor="middle" className="fill-ink-3 text-[11px]">
            {shortLeft}
          </text>
          <text x={layout.xR} y={16} textAnchor="middle" className="fill-ink-3 text-[11px]">
            {shortRight}
          </text>
          {swings.map((row) => {
            const y1 = layout.yFor(row.leftRank);
            const y2 = layout.yFor(row.rightRank);
            const betterHere = row.leftRank < row.rightRank;
            const active = hover === row.entityId;
            const stroke = betterHere ? 'var(--accent)' : 'var(--border-strong)';
            const opacity = hover && !active ? 0.25 : 1;
            return (
              <g
                key={row.entityId}
                onMouseEnter={() => setHover(row.entityId)}
                onMouseLeave={() => setHover(null)}
                opacity={opacity}
              >
                <line
                  x1={layout.xL}
                  y1={y1}
                  x2={layout.xR}
                  y2={y2}
                  stroke={stroke}
                  strokeWidth={active ? 2.5 : 1.5}
                />
                <text x={layout.xL - 8} y={y1 + 4} textAnchor="end" className="fill-ink-2 text-[11px]">
                  {row.name.length > 16 ? `${row.name.slice(0, 15)}…` : row.name}
                </text>
                <text x={layout.xR + 8} y={y2 + 4} textAnchor="start" className="fill-ink-2 text-[11px]">
                  {row.name.length > 16 ? `${row.name.slice(0, 15)}…` : row.name}
                </text>
                <circle cx={layout.xL} cy={y1} r={4} fill={stroke} />
                <circle cx={layout.xR} cy={y2} r={4} fill={stroke} />
                <text x={layout.xL} y={y1 - 6} textAnchor="middle" className="fill-ink-3 text-[10px] font-mono">
                  #{row.leftRank}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
