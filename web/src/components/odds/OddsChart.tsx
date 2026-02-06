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
    case '1d':
      // Show just time: "2:00 PM"
      return date.toLocaleString('en-US', {
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
  // Y-axis domain state: [min, max] in 0-1 range (fit to data)
  const [yDomain, setYDomain] = useState<[number, number]>([0, 1]);

  // Track which contracts are hidden (toggled off)
  const [hiddenContracts, setHiddenContracts] = useState<Set<string>>(new Set());

  // Brush indices ref to persist across re-renders without causing them
  const brushIndicesRef = useRef<{ startIndex: number; endIndex: number } | null>(null);
  const [, forceUpdate] = useState(0);

  // Tooltip data for custom rendering
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);

  // Toggle contract visibility
  const toggleContract = useCallback((contract: string) => {
    setHiddenContracts(prev => {
      const next = new Set(prev);
      if (next.has(contract)) {
        next.delete(contract);
      } else {
        next.add(contract);
      }
      return next;
    });
  }, []);

  const handleTooltipData = useCallback((data: TooltipData | null) => {
    setTooltipData(data);
  }, []);

  // Calculate data range for smart zooming - only consider visible contracts
  const dataRange = useMemo(() => {
    if (!data || data.series.length === 0) return { min: 0, max: 1 };

    // Get visible contracts (not hidden)
    const visibleContracts = data.contracts.filter(c => !hiddenContracts.has(c));
    if (visibleContracts.length === 0) return { min: 0, max: 1 };

    let min = 1;
    let max = 0;
    for (const point of data.series) {
      for (const [key, value] of Object.entries(point.values)) {
        if (typeof value === 'number' && visibleContracts.includes(key)) {
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
  }, [data, hiddenContracts]);

  // Update Y domain when data range changes (including when contracts are hidden/shown)
  useEffect(() => {
    setYDomain([dataRange.min, dataRange.max]);
  }, [dataRange]);

  // Reset brush and hidden contracts only when data changes
  useEffect(() => {
    brushIndicesRef.current = null;
    setHiddenContracts(new Set());
  }, [data]);

  // Handle brush change - store in ref to avoid re-render loops
  const handleBrushChange = useCallback((params: { startIndex?: number; endIndex?: number }) => {
    if (params.startIndex !== undefined && params.endIndex !== undefined) {
      brushIndicesRef.current = { startIndex: params.startIndex, endIndex: params.endIndex };
    }
  }, []);


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
    // Aim for roughly 8 labels on the X-axis
    if (dataLength <= 8) return 0; // Show all labels
    return Math.floor(dataLength / 8);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Price History</CardTitle>
        <TimeFilterDropdown value={timeFilter} onChange={onTimeFilterChange} />
      </CardHeader>
      <CardContent>
        <div className="h-[400px] relative">
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
            // Chart plot area (where data points are drawn)
            const plotTop = 5;
            const plotBottom = 90; // X-axis + brush area
            const plotHeight = 400 - plotTop - plotBottom;

            // Label bounds (can extend into x-axis area)
            const labelMinY = plotTop + 8;
            const labelMaxY = plotTop + plotHeight + 35; // Allow overlap with x-axis

            const baseLabelHeight = 16;
            const baseMinSpacing = 18;
            const minScale = 0.6; // Can shrink labels up to 40%

            // Calculate Y positions for each label (all on right side)
            const labels = tooltipData.values
              .map(({ name, value, color }) => {
                const yPercent = (value - yDomain[0]) / (yDomain[1] - yDomain[0]);
                const rawY = plotTop + (1 - yPercent) * plotHeight;
                return { name, value, color, rawY, adjustedY: rawY, scale: 1.0 };
              })
              .sort((a, b) => a.rawY - b.rawY); // Sort by Y position (top to bottom)

            // Calculate how much space we need vs have
            const totalNeededSpace = (labels.length - 1) * baseMinSpacing;
            const yRange = labels.length > 1
              ? labels[labels.length - 1].rawY - labels[0].rawY
              : totalNeededSpace;

            // Determine scale factor based on crowding
            let scale = 1.0;
            if (yRange < totalNeededSpace) {
              scale = Math.max(minScale, yRange / totalNeededSpace);
            }

            const minSpacing = baseMinSpacing * scale;
            labels.forEach(label => { label.scale = scale; });

            // Resolve overlaps - only push labels that actually overlap
            for (let pass = 0; pass < 15; pass++) {
              let maxOverlap = 0;

              for (let i = 0; i < labels.length - 1; i++) {
                const curr = labels[i];
                const next = labels[i + 1];
                const overlap = (curr.adjustedY + minSpacing) - next.adjustedY;

                if (overlap > 0) {
                  maxOverlap = Math.max(maxOverlap, overlap);
                  const adjustment = overlap / 2 + 0.5;
                  curr.adjustedY -= adjustment;
                  next.adjustedY += adjustment;
                }
              }

              // Clamp to bounds
              for (let i = 0; i < labels.length; i++) {
                if (labels[i].adjustedY < labelMinY) {
                  const diff = labelMinY - labels[i].adjustedY;
                  labels[i].adjustedY = labelMinY;
                  for (let j = i + 1; j < labels.length; j++) {
                    labels[j].adjustedY += diff * 0.7;
                  }
                }
              }
              for (let i = labels.length - 1; i >= 0; i--) {
                if (labels[i].adjustedY > labelMaxY) {
                  const diff = labels[i].adjustedY - labelMaxY;
                  labels[i].adjustedY = labelMaxY;
                  for (let j = i - 1; j >= 0; j--) {
                    labels[j].adjustedY -= diff * 0.7;
                  }
                }
              }

              if (maxOverlap < 1) break;
            }

            // Calculate font size in pixels (base is 12px for text-xs)
            const fontSize = Math.round(12 * scale);

            return labels.map(({ name, value, color, adjustedY, scale: labelScale }) => (
              <div
                key={name}
                className="absolute z-10 font-medium pointer-events-none whitespace-nowrap rounded"
                style={{
                  left: tooltipData.cursorX + 8,
                  top: adjustedY,
                  transform: 'translateY(-50%)',
                  color,
                  backgroundColor: 'rgba(255, 255, 255, 0.69)',
                  fontSize: `${fontSize}px`,
                  padding: `${Math.round(2 * labelScale)}px ${Math.round(6 * labelScale)}px`,
                  lineHeight: 1.2,
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
                  hide={hiddenContracts.has(contract)}
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
        {/* Custom clickable legend */}
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2">
          {data.contracts.map((contract, index) => {
            const isHidden = hiddenContracts.has(contract);
            const color = CHART_COLORS[index % CHART_COLORS.length];
            return (
              <button
                key={contract}
                onClick={() => toggleContract(contract)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-sm transition-opacity hover:bg-muted ${
                  isHidden ? 'opacity-40' : ''
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className={isHidden ? 'line-through' : ''}>{contract}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
