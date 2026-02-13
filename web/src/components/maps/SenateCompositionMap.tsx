'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { geoAlbersUsa, geoPath } from 'd3-geo';
import * as topojson from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import { Skeleton } from '@/components/ui/skeleton';
import { MapTooltip } from './MapTooltip';
import { MapLegend } from './MapLegend';
import {
  SENATE_COMPOSITION,
  DELEGATION_COLORS,
  HOVER_COLOR,
} from '@/data/senate-composition';
import type { StateDelegation } from '@/data/senate-composition';

interface StateProperties {
  GEOID: string;
  STATEFP: string;
  STUSPS: string;
  NAME: string;
}

interface TooltipState {
  stateName: string;
  stateAbbrev: string;
  delegation: StateDelegation;
  x: number;
  y: number;
}

/** States with 2026 senate races (Class II + OH special) */
const SENATE_RACE_STATES_2026 = new Set([
  'AL', 'AK', 'AR', 'CO', 'DE', 'GA', 'ID', 'IL', 'IA', 'KS',
  'KY', 'LA', 'ME', 'MA', 'MI', 'MN', 'MS', 'MT', 'NE', 'NH',
  'NJ', 'NM', 'NC', 'OK', 'OR', 'RI', 'SC', 'SD', 'TN', 'TX',
  'VA', 'WV', 'WY', 'OH', 'FL',
]);

export function SenateCompositionMap() {
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
      const delegation = SENATE_COMPOSITION[stusps];
      if (!delegation) return isDark ? '#333' : '#ccc';
      const colors = DELEGATION_COLORS[delegation.delegation];
      return isDark ? colors.dark : colors.light;
    },
    [hoveredState, isDark]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, stusps: string, stateName: string) => {
      const delegation = SENATE_COMPOSITION[stusps];
      if (!delegation) return;
      setHoveredState(stusps);
      setTooltip({
        stateName,
        stateAbbrev: stusps,
        delegation,
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
    if (SENATE_RACE_STATES_2026.has(stusps)) {
      window.location.href = `/senate/${stusps.toLowerCase()}`;
    }
  }, []);

  const handleTouchStart = useCallback(
    (stusps: string, stateName: string) => {
      const delegation = SENATE_COMPOSITION[stusps];
      if (!delegation) return;
      setSelectedState((prev) => (prev === stusps ? null : stusps));
      setHoveredState(stusps);
    },
    []
  );

  if (features.length === 0) {
    return <Skeleton className="aspect-[8/5] w-full rounded-lg" />;
  }

  const selectedDelegation = selectedState
    ? SENATE_COMPOSITION[selectedState]
    : null;
  const selectedName = selectedState
    ? features.find(
        (f) => f.properties.STUSPS === selectedState
      )?.properties.NAME
    : null;

  return (
    <div className="space-y-4">
      <MapLegend />

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox="0 0 960 600"
          className="w-full h-auto"
          role="img"
          aria-label="US Senate composition map showing party control by state"
        >
          {/* State fills */}
          {features.map((f) => {
            const props = f.properties;
            const d = (props as unknown as Record<string, string>)._d;
            if (!d) return null;
            const hasRace = SENATE_RACE_STATES_2026.has(props.STUSPS);
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
          <MapTooltip
            stateName={tooltip.stateName}
            delegation={tooltip.delegation}
            x={tooltip.x}
            y={tooltip.y}
          />
        )}
      </div>

      {/* Mobile selected-state card */}
      {selectedState && selectedDelegation && selectedName && (
        <div className="rounded-lg border bg-card p-4 md:hidden">
          <p className="font-semibold mb-1">
            {selectedName} ({selectedState})
          </p>
          {selectedDelegation.senators.map((senator, i) => (
            <p key={i} className="text-sm text-muted-foreground">
              ({senator.party}) {senator.name}
            </p>
          ))}
          {SENATE_RACE_STATES_2026.has(selectedState) && (
            <a
              href={`/senate/${selectedState.toLowerCase()}`}
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
