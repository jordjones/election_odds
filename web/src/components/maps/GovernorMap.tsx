'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { geoAlbersUsa, geoPath } from 'd3-geo';
import * as topojson from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import { Skeleton } from '@/components/ui/skeleton';
import { GovernorMapTooltip } from './GovernorMapTooltip';
import { GovernorMapLegend } from './GovernorMapLegend';
import {
  GOVERNOR_COMPOSITION,
  GOVERNOR_COLORS,
  GOVERNOR_RACE_STATES_2026,
  HOVER_COLOR,
} from '@/data/governor-composition';
import type { GovernorInfo } from '@/data/governor-composition';

interface StateProperties {
  GEOID: string;
  STATEFP: string;
  STUSPS: string;
  NAME: string;
}

interface TooltipState {
  stateName: string;
  governor: GovernorInfo;
  x: number;
  y: number;
}

export function GovernorMap() {
  const [features, setFeatures] = useState<Feature<Geometry, StateProperties>[]>([]);
  const [meshPath, setMeshPath] = useState<string>('');
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Detect dark mode
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Also check for class-based dark mode (common with shadcn)
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    setIsDark(document.documentElement.classList.contains('dark'));
    return () => observer.disconnect();
  }, []);

  // Load and project TopoJSON
  useEffect(() => {
    const projection = geoAlbersUsa().scale(1200).translate([480, 300]);
    const pathGen = geoPath(projection);

    fetch('/data/maps/boundaries/us-states.topojson')
      .then((r) => r.json())
      .then((topo: Topology) => {
        const objectName = Object.keys(topo.objects)[0];
        const fc = topojson.feature(
          topo,
          topo.objects[objectName] as GeometryCollection<StateProperties>
        ) as FeatureCollection<Geometry, StateProperties>;

        // Pre-compute path strings
        const projected = fc.features.map((f) => ({
          ...f,
          properties: {
            ...f.properties,
            _d: pathGen(f) || '',
          },
        }));
        setFeatures(projected as unknown as Feature<Geometry, StateProperties>[]);

        // State borders mesh
        const mesh = topojson.mesh(
          topo,
          topo.objects[objectName] as GeometryCollection,
          (a, b) => a !== b
        );
        setMeshPath(pathGen(mesh) || '');
      });
  }, []);

  const getFill = useCallback(
    (stusps: string) => {
      if (hoveredState === stusps) return HOVER_COLOR;
      const governor = GOVERNOR_COMPOSITION[stusps];
      if (!governor) return isDark ? '#333' : '#ccc';
      const colors = GOVERNOR_COLORS[governor.party];
      return isDark ? colors.dark : colors.light;
    },
    [hoveredState, isDark]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, stusps: string, stateName: string) => {
      const governor = GOVERNOR_COMPOSITION[stusps];
      if (!governor) return;
      setHoveredState(stusps);
      setTooltip({
        stateName,
        governor,
        x: e.clientX,
        y: e.clientY,
      });
    },
    []
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredState(null);
    setTooltip(null);
  }, []);

  const handleClick = useCallback((stusps: string) => {
    if (GOVERNOR_RACE_STATES_2026.has(stusps)) {
      window.location.href = `/governors/${stusps.toLowerCase()}`;
    }
  }, []);

  const handleTouchStart = useCallback(
    (stusps: string, _stateName: string) => {
      const governor = GOVERNOR_COMPOSITION[stusps];
      if (!governor) return;
      setSelectedState((prev) => (prev === stusps ? null : stusps));
      setHoveredState(stusps);
    },
    []
  );

  if (features.length === 0) {
    return <Skeleton className="aspect-[8/5] w-full rounded-lg" />;
  }

  const selectedGovernor = selectedState
    ? GOVERNOR_COMPOSITION[selectedState]
    : null;
  const selectedName = selectedState
    ? features.find(
        (f) => f.properties.STUSPS === selectedState
      )?.properties.NAME
    : null;

  return (
    <div className="space-y-4">
      <GovernorMapLegend />

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox="0 0 960 600"
          className="w-full h-auto"
          role="img"
          aria-label="US governor map showing party control by state"
        >
          {/* State fills */}
          {features.map((f) => {
            const props = f.properties;
            const d = (props as unknown as Record<string, string>)._d;
            if (!d) return null;
            const hasRace = GOVERNOR_RACE_STATES_2026.has(props.STUSPS);
            return (
              <path
                key={props.GEOID}
                d={d}
                fill={getFill(props.STUSPS)}
                stroke="none"
                className={hasRace ? 'cursor-pointer' : ''}
                onMouseEnter={(e) =>
                  handleMouseMove(e, props.STUSPS, props.NAME)
                }
                onMouseMove={(e) =>
                  handleMouseMove(e, props.STUSPS, props.NAME)
                }
                onMouseLeave={handleMouseLeave}
                onClick={() => handleClick(props.STUSPS)}
                onTouchStart={() =>
                  handleTouchStart(props.STUSPS, props.NAME)
                }
              />
            );
          })}

          {/* Dashed amber border overlay for 2026-race states */}
          {features.map((f) => {
            const props = f.properties;
            const d = (props as unknown as Record<string, string>)._d;
            if (!d || !GOVERNOR_RACE_STATES_2026.has(props.STUSPS)) return null;
            return (
              <path
                key={`race-${props.GEOID}`}
                d={d}
                fill="none"
                stroke={isDark ? 'oklch(0.75 0.15 85)' : 'oklch(0.65 0.18 85)'}
                strokeWidth={1.5}
                strokeDasharray="4 2"
                className="pointer-events-none"
              />
            );
          })}

          {/* State borders */}
          {meshPath && (
            <path
              d={meshPath}
              fill="none"
              stroke={isDark ? '#555' : '#fff'}
              strokeWidth={1}
              strokeLinejoin="round"
              className="pointer-events-none"
            />
          )}
        </svg>

        {/* Desktop tooltip */}
        {tooltip && (
          <GovernorMapTooltip
            stateName={tooltip.stateName}
            governor={tooltip.governor}
            x={tooltip.x}
            y={tooltip.y}
          />
        )}
      </div>

      {/* Mobile selected-state card */}
      {selectedState && selectedGovernor && selectedName && (
        <div className="rounded-lg border bg-card p-4 md:hidden">
          <p className="font-semibold mb-1">
            {selectedName} ({selectedState})
          </p>
          <p className="text-sm text-muted-foreground">
            <span
              className={
                selectedGovernor.party === 'R'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-blue-600 dark:text-blue-400'
              }
            >
              ({selectedGovernor.party})
            </span>{' '}
            {selectedGovernor.name}
          </p>
          <p className="text-xs text-muted-foreground">
            In office since {selectedGovernor.since}
          </p>
          {GOVERNOR_RACE_STATES_2026.has(selectedState) && (
            <a
              href={`/governors/${selectedState.toLowerCase()}`}
              className="mt-2 inline-block text-sm text-primary underline"
            >
              View 2026 race odds &rarr;
            </a>
          )}
        </div>
      )}
    </div>
  );
}
