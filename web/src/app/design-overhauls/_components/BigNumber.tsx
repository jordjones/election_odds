interface BigNumberProps {
  value: string;
  label: string;
  change?: string;
  changeColor?: string;
  className?: string;
}

export function BigNumber({ value, label, change, changeColor, className = '' }: BigNumberProps) {
  return (
    <div className={`flex flex-col ${className}`}>
      <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
      <span className="text-3xl font-bold font-mono tabular-nums">{value}</span>
      {change && (
        <span className={`text-sm font-mono ${changeColor || 'text-muted-foreground'}`}>{change}</span>
      )}
    </div>
  );
}
