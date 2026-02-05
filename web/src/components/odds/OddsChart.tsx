'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
} from 'recharts';
import type { ChartData, TimeFilter } from '@/lib/types';
import { TimeFilterDropdown } from './TimeFilterDropdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface OddsChartProps {
  data: ChartData | undefined;
  isLoading?: boolean;
  timeFilter: TimeFilter;
  onTimeFilterChange: (filter: TimeFilter) => void;
}

/**
 * Format timestamp based on the time filter for appropriate granularity display
 */
function formatTimestamp(timestamp: string, timeFilter: TimeFilter): string {
  const date = new Date(timestamp);

  switch (timeFilter) {
    case '4h':
      // Show time only: "2:30 PM"
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    case '1d':
      // Show time with hour: "Jan 23 2:00 PM"
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    case '1w':
      // Show day and hour: "Jan 23 2PM"
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        hour12: true,
      });
    case '30d':
    case 'all':
    default:
      // Show date only: "Jan 23"
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
  }
}

// Color palette for chart lines
const CHART_COLORS = [
  '#2563eb', // blue
  '#dc2626', // red
  '#16a34a', // green
  '#9333ea', // purple
  '#ea580c', // orange
  '#0891b2', // cyan
  '#c026d3', // fuchsia
  '#65a30d', // lime
];

export function OddsChart({
  data,
  isLoading,
  timeFilter,
  onTimeFilterChange,
}: OddsChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Price History</CardTitle>
          <TimeFilterDropdown value={timeFilter} onChange={onTimeFilterChange} />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.series.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Price History</CardTitle>
          <TimeFilterDropdown value={timeFilter} onChange={onTimeFilterChange} />
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            No chart data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transform data for Recharts with appropriate timestamp formatting
  const chartData = data.series.map((point) => ({
    timestamp: formatTimestamp(point.timestamp, timeFilter),
    fullTimestamp: point.timestamp, // Keep full timestamp for tooltip
    ...point.values,
  }));

  // Calculate X-axis tick interval to avoid label crowding
  const getXAxisInterval = (): number | 'preserveStartEnd' => {
    const dataLength = chartData.length;
    // Aim for roughly 8-12 labels on the X-axis
    if (dataLength <= 12) return 0; // Show all labels
    return Math.floor(dataLength / 10);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Price History</CardTitle>
        <TimeFilterDropdown value={timeFilter} onChange={onTimeFilterChange} />
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="timestamp"
                tick={{ fontSize: 11 }}
                interval={getXAxisInterval()}
                className="text-muted-foreground"
                angle={timeFilter === '1d' ? -45 : 0}
                textAnchor={timeFilter === '1d' ? 'end' : 'middle'}
                height={timeFilter === '1d' ? 60 : 30}
              />
              <YAxis
                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                domain={[0, 1]}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip
                formatter={(value) => {
                  if (typeof value === 'number') {
                    return [`${(value * 100).toFixed(1)}%`, ''];
                  }
                  return ['--', ''];
                }}
                labelFormatter={(label, payload) => {
                  // Use full timestamp from payload for detailed tooltip
                  if (payload && payload.length > 0 && payload[0].payload?.fullTimestamp) {
                    const date = new Date(payload[0].payload.fullTimestamp);
                    return date.toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    });
                  }
                  return label;
                }}
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
              />
              <Legend />
              {data.contracts.map((contract, index) => (
                <Line
                  key={contract}
                  type="monotone"
                  dataKey={contract}
                  name={contract}
                  stroke={CHART_COLORS[index % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
              {/* Range selector brush below chart - always shown */}
              <Brush
                dataKey="timestamp"
                height={40}
                stroke="#8884d8"
                fill="hsl(var(--muted))"
                travellerWidth={10}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
