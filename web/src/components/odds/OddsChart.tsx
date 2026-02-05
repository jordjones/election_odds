'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  type TooltipProps,
} from 'recharts';
import type { ChartData, TimeFilter } from '@/lib/types';
import { TimeFilterDropdown } from './TimeFilterDropdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

// Tooltip data for custom rendering
interface TooltipData {
  timestamp: string;
  cursorX: number;
  values: { name: string; value: number; color: string }[];
}

interface CustomTooltipContentProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
    payload?: Record<string, unknown>;
  }>;
  coordinate?: { x: number; y: number };
  onTooltipData: (data: TooltipData | null) => void;
}

// Custom tooltip content that captures data for external display
function CustomTooltipContent({ active, payload, coordinate, onTooltipData }: CustomTooltipContentProps) {
  const prevTimestampRef = useRef<string | null>(null);

  // Use useEffect with stable dependency (timestamp string) to avoid infinite loops
  const currentTimestamp = active && payload?.[0]?.payload?.fullTimestamp as string | undefined;

  useEffect(() => {
    if (currentTimestamp && currentTimestamp !== prevTimestampRef.current && payload && coordinate) {
      prevTimestampRef.current = currentTimestamp;
      const values = payload
        .filter((p) => p.value !== undefined && p.value !== null)
        .map((p) => ({
          name: p.name || '',
          value: p.value as number,
          color: p.color || '#000',
        }))
        .sort((a, b) => b.value - a.value);

      onTooltipData({
        timestamp: currentTimestamp,
        cursorX: coordinate.x,
        values,
      });
    } else if (!active && prevTimestampRef.current !== null) {
      prevTimestampRef.current = null;
      onTooltipData(null);
    }
  }, [active, currentTimestamp, payload, coordinate, onTooltipData]);

  // Return empty div to keep tooltip active (cursor line still renders)
  return <div style={{ display: 'none' }} />;
}

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
      // Show date only: "Jan 23"
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    case 'all':
    default:
      // Show date with year for uniqueness: "Jan 23 '25"
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: '2-digit',
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
  // Y-axis zoom state: [min, max] in 0-1 range
  const [yDomain, setYDomain] = useState<[number, number]>([0, 1]);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Brush indices ref to persist across re-renders without causing them
  const brushIndicesRef = useRef<{ startIndex: number; endIndex: number } | null>(null);
  const [, forceUpdate] = useState(0);

  // Tooltip data for custom rendering
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);

  const handleTooltipData = useCallback((data: TooltipData | null) => {
    setTooltipData(data);
  }, []);

  // Calculate data range for smart zooming
  const dataRange = useMemo(() => {
    if (!data || data.series.length === 0) return { min: 0, max: 1 };

    let min = 1;
    let max = 0;
    for (const point of data.series) {
      for (const value of Object.values(point.values)) {
        if (typeof value === 'number') {
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      }
    }
    // Add padding
    const padding = (max - min) * 0.1;
    return {
      min: Math.max(0, min - padding),
      max: Math.min(1, max + padding),
    };
  }, [data]);

  // Reset zoom and brush when data or time filter changes
  useEffect(() => {
    setYDomain([0, 1]);
    brushIndicesRef.current = null;
  }, [data, timeFilter]);

  // Handle brush change - store in ref to avoid re-render loops
  const handleBrushChange = useCallback((params: { startIndex?: number; endIndex?: number }) => {
    if (params.startIndex !== undefined && params.endIndex !== undefined) {
      brushIndicesRef.current = { startIndex: params.startIndex, endIndex: params.endIndex };
    }
  }, []);

  // Handle mouse wheel for vertical zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    // Only zoom when scrolling over the main chart area, not the brush
    const target = e.target as HTMLElement;
    if (target.closest('.recharts-brush')) {
      return; // Don't intercept brush events
    }
    e.preventDefault();

    const zoomFactor = 0.1;
    const direction = e.deltaY > 0 ? 1 : -1; // Scroll down = zoom out, up = zoom in

    setYDomain(([currentMin, currentMax]) => {
      const range = currentMax - currentMin;
      const center = (currentMin + currentMax) / 2;

      // Calculate new range
      const newRange = direction > 0
        ? Math.min(1, range * (1 + zoomFactor))  // Zoom out
        : Math.max(0.05, range * (1 - zoomFactor)); // Zoom in (min 5% range)

      // Calculate new bounds centered
      let newMin = center - newRange / 2;
      let newMax = center + newRange / 2;

      // Clamp to valid range
      if (newMin < 0) {
        newMin = 0;
        newMax = Math.min(1, newRange);
      }
      if (newMax > 1) {
        newMax = 1;
        newMin = Math.max(0, 1 - newRange);
      }

      return [newMin, newMax];
    });
  }, []);

  // Attach wheel event listener
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Reset zoom to full range
  const resetZoom = useCallback(() => {
    setYDomain([0, 1]);
  }, []);

  // Fit zoom to data range
  const fitToData = useCallback(() => {
    setYDomain([dataRange.min, dataRange.max]);
  }, [dataRange]);

  const isZoomed = yDomain[0] !== 0 || yDomain[1] !== 1;

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
  // Include index to ensure unique data points for tooltip
  const chartData = data.series.map((point, index) => ({
    index,
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
        <div className="flex items-center gap-2">
          {isZoomed && (
            <Button variant="outline" size="sm" onClick={resetZoom}>
              Reset Zoom
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={fitToData}>
            Fit to Data
          </Button>
          <TimeFilterDropdown value={timeFilter} onChange={onTimeFilterChange} />
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={chartContainerRef}
          className="h-[400px] cursor-ns-resize relative"
          title="Scroll to zoom vertically"
        >
          {/* Timestamp label positioned above cursor line */}
          {tooltipData && (
            <div
              className="absolute z-10 text-sm font-semibold text-muted-foreground pointer-events-none whitespace-nowrap px-1 rounded"
              style={{
                left: tooltipData.cursorX,
                top: 0,
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
              }}
            >
              {new Date(tooltipData.timestamp).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })}
            </div>
          )}
          {/* Value labels positioned next to data points */}
          {tooltipData && (() => {
            // Chart area constants - tuned for Recharts layout
            const chartTop = 5;
            const chartBottom = 90; // X-axis + brush + legend
            const chartHeight = 400 - chartTop - chartBottom;
            const labelHeight = 16;
            const minGap = 2;

            // Calculate Y positions for each label
            const labels = tooltipData.values.map(({ name, value, color }) => {
              const yPercent = (value - yDomain[0]) / (yDomain[1] - yDomain[0]);
              const rawY = chartTop + (1 - yPercent) * chartHeight;
              return { name, value, color, rawY, adjustedY: rawY };
            });

            // Sort by Y position (top to bottom) for overlap prevention
            labels.sort((a, b) => a.rawY - b.rawY);

            // Spread overlapping labels apart from their center point
            // This keeps labels closer to their actual positions
            for (let i = 0; i < labels.length - 1; i++) {
              const curr = labels[i];
              const next = labels[i + 1];
              const overlap = (curr.adjustedY + labelHeight / 2 + minGap) - (next.adjustedY - labelHeight / 2);

              if (overlap > 0) {
                // Split the overlap between both labels
                const shift = overlap / 2;
                curr.adjustedY -= shift;
                next.adjustedY += shift;
              }
            }

            return labels.map(({ name, value, color, adjustedY }) => (
              <div
                key={name}
                className="absolute z-10 text-xs font-medium pointer-events-none whitespace-nowrap px-1 rounded"
                style={{
                  left: tooltipData.cursorX + 8,
                  top: adjustedY,
                  transform: 'translateY(-50%)',
                  color,
                  backgroundColor: 'rgba(255, 255, 255, 0.85)',
                }}
              >
                {(value * 100).toFixed(1)}% {name}
              </div>
            ));
          })()}
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
                domain={yDomain}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                allowDataOverflow={true}
              />
              <Tooltip
                isAnimationActive={false}
                cursor={{ stroke: '#888', strokeWidth: 1 }}
                content={<CustomTooltipContent onTooltipData={handleTooltipData} />}
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
                  activeDot={{
                    r: 3,
                    strokeWidth: 0,
                    fill: CHART_COLORS[index % CHART_COLORS.length],
                  }}
                  isAnimationActive={false}
                  connectNulls={true}
                />
              ))}
              {/* Range selector brush below chart */}
              <Brush
                dataKey="timestamp"
                height={40}
                stroke="#e5e5e5"
                fill="#f5f5f5"
                travellerWidth={15}
                onChange={handleBrushChange}
                startIndex={brushIndicesRef.current?.startIndex}
                endIndex={brushIndicesRef.current?.endIndex}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
