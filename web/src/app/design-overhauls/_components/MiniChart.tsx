'use client';

import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

interface MiniChartProps {
  data: { value: number }[];
  color?: string;
  height?: number;
  width?: number | string;
}

export function MiniChart({ data, color = '#2563eb', height = 32, width = 80 }: MiniChartProps) {
  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min) * 0.1 || 0.01;

  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={data}>
        <YAxis domain={[min - padding, max + padding]} hide />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
