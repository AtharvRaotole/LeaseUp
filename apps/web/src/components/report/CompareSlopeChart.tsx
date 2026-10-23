import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../ui/Badge';
import { displayBrandName } from '../../lib/brand-display';
import { resolveLabelYs } from '../../lib/slope-layout';

type Swing = {
  entityId: string;
  name: string;
  leftRank: number;
  rightRank: number;
  delta: number;
};

function useMobileChart() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return mobile;
}

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
  const mobile = useMobileChart();
  const shortLeft = leftName.split(',')[0]?.trim() ?? leftName;
  const shortRight = rightName.split(',')[0]?.trim() ?? rightName;

  const rows = useMemo(
    () =>
      [...swings]
        .sort((a, b) => b.delta - a.delta)
        .slice(0, 8)
        .map((s) => ({
          ...s,
          displayName: displayBrandName(s.entityId, s.name),
        })),
    [swings]
  );

  const layout = useMemo(() => {
    const maxRank = Math.max(...rows.flatMap((s) => [s.leftRank, s.rightRank]), 10);
    const w = 640;
    const h = Math.max(360, 56 + rows.length * 28);
    const pad = { t: 72, r: 108, b: 20, l: 108 };
    const innerH = h - pad.t - pad.b;
    const yFor = (rank: number) => pad.t + ((rank - 1) / Math.max(1, maxRank - 1)) * innerH;
    const xL = pad.l;
    const xR = w - pad.r;
    const leftNatural = rows.map((r) => yFor(r.leftRank));
    const rightNatural = rows.map((r) => yFor(r.rightRank));
    const minY = pad.t + 8;
    const maxY = h - pad.b - 8;
    const leftLabelY = resolveLabelYs(leftNatural, minY, maxY);
    const rightLabelY = resolveLabelYs(rightNatural, minY, maxY);
    return { w, h, pad, xL, xR, yFor, leftLabelY, rightLabelY, maxRank };
  }, [rows]);

  return (
    <section>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-h3 font-semibold text-ink">Same brands, different places.</h3>
        {recordedDemo && <Badge tone="warn">Recorded data</Badge>}
      </div>
      <p className="mt-2 text-sm text-ink-2">
        {shortLeft} vs {shortRight}. Same brands, very different appetite.
      </p>

      {mobile ? (
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-card border border-border bg-surface p-4 text-sm">
          <p className="col-span-2 text-[13px] font-medium text-ink">{shortLeft} vs {shortRight}</p>
          {rows.map((row) => (
            <div key={row.entityId} className="col-span-2 grid grid-cols-2 gap-2 border-t border-border pt-2 first:border-0 first:pt-0">
              <div>
                <p className="truncate text-ink">{row.displayName}</p>
                <p className="font-mono text-xs tabular-nums text-ink-3">#{row.leftRank}</p>
              </div>
              <div className="text-right">
                <p className="truncate text-ink">{row.displayName}</p>
                <p className="font-mono text-xs tabular-nums text-ink-3">#{row.rightRank}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-card border border-border bg-surface p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-pill border border-accent/30 bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
              Higher in {shortLeft}
            </span>
            <span className="rounded-pill border border-border bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink-4">
              Higher in {shortRight}
            </span>
          </div>
          <svg
            viewBox={`0 0 ${layout.w} ${layout.h}`}
            className="w-full min-w-[320px] min-h-[360px]"
            role="img"
            aria-label={`Rank comparison ${shortLeft} and ${shortRight}`}
          >
            <text
              x={layout.xL}
              y={28}
              textAnchor="middle"
              className="fill-ink text-[13px] font-medium"
            >
              {shortLeft}
            </text>
            <text
              x={layout.xR}
              y={28}
              textAnchor="middle"
              className="fill-ink text-[13px] font-medium"
            >
              {shortRight}
            </text>
            {rows.map((row, index) => {
              const y1 = layout.yFor(row.leftRank);
              const y2 = layout.yFor(row.rightRank);
              const betterHere = row.leftRank < row.rightRank;
              const active = hover === row.entityId;
              const stroke = betterHere ? 'var(--accent)' : 'var(--ink-4)';
              const opacity = hover && !active ? 0.2 : 1;
              const ly = layout.leftLabelY[index]!;
              const ry = layout.rightLabelY[index]!;
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
                  <circle cx={layout.xL} cy={y1} r={4} fill={stroke} />
                  <circle cx={layout.xR} cy={y2} r={4} fill={stroke} />
                  <line x1={layout.xL - 6} y1={y1} x2={layout.xL - 72} y2={ly} stroke="var(--border)" strokeWidth={1} />
                  <line x1={layout.xR + 6} y1={y2} x2={layout.xR + 72} y2={ry} stroke="var(--border)" strokeWidth={1} />
                  <text x={layout.xL - 76} y={ly + 4} textAnchor="end" className="fill-ink-2 text-[11px]">
                    {row.displayName.length > 18 ? `${row.displayName.slice(0, 17)}…` : row.displayName}
                    <tspan className="fill-ink-3 font-mono text-[10px]"> #{row.leftRank}</tspan>
                  </text>
                  <text x={layout.xR + 76} y={ry + 4} textAnchor="start" className="fill-ink-2 text-[11px]">
                    {row.displayName.length > 18 ? `${row.displayName.slice(0, 17)}…` : row.displayName}
                    <tspan className="fill-ink-3 font-mono text-[10px]"> #{row.rightRank}</tspan>
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </section>
  );
}
