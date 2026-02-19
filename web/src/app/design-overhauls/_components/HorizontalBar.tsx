'use client';

interface HorizontalBarProps {
  /** 0–1 probability value */
  value: number;
  /** Fill color */
  color?: string;
  /** Track color */
  trackColor?: string;
  /** Height class or pixels */
  height?: string;
  /** Show percentage label */
  showLabel?: boolean;
  /** Additional classes */
  className?: string;
  /** Animate on mount */
  animate?: boolean;
}

export function HorizontalBar({
  value,
  color = '#3b82f6',
  trackColor = '#27272a',
  height = 'h-2',
  showLabel = false,
  className = '',
  animate = true,
}: HorizontalBarProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const pct = clamped * 100;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex-1 ${height} rounded-full overflow-hidden`} style={{ backgroundColor: trackColor }}>
        <div
          className={`${height} rounded-full ${animate ? 'transition-[width] duration-500 ease-out' : ''}`}
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-mono tabular-nums min-w-[3ch] text-right">
          {pct.toFixed(0)}%
        </span>
      )}
    </div>
  );
}

/** Side-by-side dual bar (e.g. Dem vs GOP) */
interface DualBarProps {
  leftValue: number;
  rightValue: number;
  leftColor?: string;
  rightColor?: string;
  height?: string;
  showLabels?: boolean;
  className?: string;
}

export function DualBar({
  leftValue,
  rightValue,
  leftColor = '#3b82f6',
  rightColor = '#ef4444',
  height = 'h-3',
  showLabels = true,
  className = '',
}: DualBarProps) {
  const total = leftValue + rightValue || 1;
  const leftPct = (leftValue / total) * 100;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabels && (
        <span className="text-xs font-mono tabular-nums min-w-[3ch]" style={{ color: leftColor }}>
          {(leftValue * 100).toFixed(0)}%
        </span>
      )}
      <div className={`flex-1 ${height} rounded-full overflow-hidden flex`}>
        <div
          className={`${height} transition-[width] duration-500`}
          style={{ width: `${leftPct}%`, backgroundColor: leftColor }}
        />
        <div
          className={`${height} flex-1`}
          style={{ backgroundColor: rightColor }}
        />
      </div>
      {showLabels && (
        <span className="text-xs font-mono tabular-nums min-w-[3ch] text-right" style={{ color: rightColor }}>
          {(rightValue * 100).toFixed(0)}%
        </span>
      )}
    </div>
  );
}
