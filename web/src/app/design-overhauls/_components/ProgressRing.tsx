'use client';

interface ProgressRingProps {
  /** 0–1 probability value */
  value: number;
  /** Diameter in pixels */
  size?: number;
  /** Ring stroke width */
  strokeWidth?: number;
  /** Ring color (Tailwind-compatible or hex) */
  color?: string;
  /** Track color */
  trackColor?: string;
  /** Show percentage label inside */
  showLabel?: boolean;
  /** Optional label font size class */
  labelClass?: string;
  className?: string;
}

export function ProgressRing({
  value,
  size = 64,
  strokeWidth = 5,
  color = '#3b82f6',
  trackColor = '#27272a',
  showLabel = true,
  labelClass = 'text-sm font-bold font-mono',
  className = '',
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, value));
  const offset = circumference * (1 - clamped);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      {showLabel && (
        <span className={`absolute ${labelClass}`}>
          {(clamped * 100).toFixed(0)}%
        </span>
      )}
    </div>
  );
}
