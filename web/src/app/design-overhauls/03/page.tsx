'use client';

import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Swords, Trophy, TrendingUp, TrendingDown, ChevronDown,
  Flame, Zap, Users, BarChart3,
} from 'lucide-react';
import {
  mockPresidential, mockGOPPrimary, mockDEMPrimary,
  mockPartyControl, mockHouseControl, mockSenateControl,
  mockMarkets, generateMockChartData, mockStats,
} from '@/lib/api/mock-data';
import { getPartyColor, getPartyId, getPartyLabel } from '../_components/PartyColor';
import { ProgressRing } from '../_components/ProgressRing';
import { DualBar } from '../_components/HorizontalBar';
import type { Contract, Market } from '@/lib/types';

// ---- helpers ----
function fmtPct(v: number, d = 1) { return `${(v * 100).toFixed(d)}%`; }
function fmtChange(v: number) { const p = (v * 100).toFixed(1); return v > 0 ? `+${p}` : `${p}`; }
function fmtVol(v: number) {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v}`;
}

// ---- matchup data ----
interface Matchup {
  id: string;
  title: string;
  subtitle: string;
  left: Contract;
  right: Contract;
  market: Market;
  featured?: boolean;
}

function buildMatchups(): Matchup[] {
  return [
    {
      id: 'pres-main',
      title: 'Presidential',
      subtitle: '2028 General Election',
      left: mockPresidential.contracts[0],  // Vance
      right: mockPresidential.contracts[1], // Newsom
      market: mockPresidential,
      featured: true,
    },
    {
      id: 'party',
      title: 'By Party',
      subtitle: '2028 Presidential',
      left: mockPartyControl.contracts.find(c => c.name.includes('Republican'))!,
      right: mockPartyControl.contracts.find(c => c.name.includes('Democratic'))!,
      market: mockPartyControl,
    },
    {
      id: 'house',
      title: 'House Control',
      subtitle: '2026 Midterms',
      left: mockHouseControl.contracts.find(c => c.name.includes('Republican'))!,
      right: mockHouseControl.contracts.find(c => c.name.includes('Democratic'))!,
      market: mockHouseControl,
    },
    {
      id: 'senate',
      title: 'Senate Control',
      subtitle: '2026 Midterms',
      left: mockSenateControl.contracts[0],
      right: mockSenateControl.contracts[1],
      market: mockSenateControl,
    },
    {
      id: 'gop-top',
      title: 'GOP Primary',
      subtitle: 'Top 2 Candidates',
      left: mockGOPPrimary.contracts[0],
      right: mockGOPPrimary.contracts[1],
      market: mockGOPPrimary,
    },
    {
      id: 'dem-top',
      title: 'DEM Primary',
      subtitle: 'Top 2 Candidates',
      left: mockDEMPrimary.contracts[0],
      right: mockDEMPrimary.contracts[1],
      market: mockDEMPrimary,
    },
  ];
}

// ---- featured matchup hero ----
function FeaturedMatchup({ matchup }: { matchup: Matchup }) {
  const { left, right, market } = matchup;
  const leftColor = getPartyColor(left.name);
  const rightColor = getPartyColor(right.name);
  const chartData = generateMockChartData(market);

  const leftWinning = left.aggregatedPrice > right.aggregatedPrice;

  return (
    <div className="border border-zinc-800 rounded-2xl bg-gradient-to-b from-zinc-900 to-zinc-950 overflow-hidden mb-8">
      {/* Header */}
      <div className="text-center py-4 border-b border-zinc-800">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Flame className="w-4 h-4 text-orange-400" />
          <span className="text-xs uppercase tracking-wider font-bold text-orange-400">Featured Matchup</span>
        </div>
        <h2 className="text-lg font-bold">{matchup.title} &mdash; {matchup.subtitle}</h2>
      </div>

      {/* VS display */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center py-8 px-4 md:px-12">
        {/* Left fighter */}
        <div className="text-center">
          <ProgressRing
            value={left.aggregatedPrice}
            size={100}
            strokeWidth={6}
            color={leftColor}
            labelClass="text-lg font-bold font-mono"
            className="mx-auto mb-3"
          />
          <h3 className="text-xl font-bold">{left.name}</h3>
          <p className="text-sm text-zinc-500">{getPartyLabel(getPartyId(left.name))}</p>
          <div className={`text-sm font-mono mt-1 ${left.priceChange > 0 ? 'text-emerald-400' : left.priceChange < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
            {fmtChange(left.priceChange)} today
          </div>
          {leftWinning && (
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400">
              <Trophy className="w-3 h-3" /> Leading
            </div>
          )}
        </div>

        {/* VS badge */}
        <div className="flex flex-col items-center gap-2 px-6">
          <div className="w-16 h-16 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center">
            <Swords className="w-7 h-7 text-zinc-400" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-600">VS</span>
        </div>

        {/* Right fighter */}
        <div className="text-center">
          <ProgressRing
            value={right.aggregatedPrice}
            size={100}
            strokeWidth={6}
            color={rightColor}
            labelClass="text-lg font-bold font-mono"
            className="mx-auto mb-3"
          />
          <h3 className="text-xl font-bold">{right.name}</h3>
          <p className="text-sm text-zinc-500">{getPartyLabel(getPartyId(right.name))}</p>
          <div className={`text-sm font-mono mt-1 ${right.priceChange > 0 ? 'text-emerald-400' : right.priceChange < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
            {fmtChange(right.priceChange)} today
          </div>
          {!leftWinning && (
            <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400">
              <Trophy className="w-3 h-3" /> Leading
            </div>
          )}
        </div>
      </div>

      {/* Spread bar */}
      <div className="px-6 pb-4">
        <DualBar
          leftValue={left.aggregatedPrice}
          rightValue={right.aggregatedPrice}
          leftColor={leftColor}
          rightColor={rightColor}
          height="h-4"
        />
      </div>

      {/* Chart */}
      <div className="px-4 pb-4">
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2 font-medium">30-Day Trend</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData.series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(v: string) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                stroke="#3f3f46" fontSize={10} tick={{ fill: '#71717a' }}
              />
              <YAxis
                tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                stroke="#3f3f46" fontSize={10} tick={{ fill: '#71717a' }}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '6px', fontSize: '12px' }}
                formatter={(value: number, name: string) => [fmtPct(value), name]}
              />
              <Area type="monotone" dataKey={`values.${left.name}`} name={left.name}
                stroke={leftColor} fill={leftColor} fillOpacity={0.1} strokeWidth={2}
                dot={false} isAnimationActive={false} connectNulls />
              <Area type="monotone" dataKey={`values.${right.name}`} name={right.name}
                stroke={rightColor} fill={rightColor} fillOpacity={0.1} strokeWidth={2}
                dot={false} isAnimationActive={false} connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 border-t border-zinc-800">
        <div className="text-center py-3 border-r border-zinc-800">
          <div className="text-xs text-zinc-500 uppercase tracking-wider">Spread</div>
          <div className="text-lg font-bold font-mono tabular-nums">
            {((left.aggregatedPrice - right.aggregatedPrice) * 100).toFixed(1)}pp
          </div>
        </div>
        <div className="text-center py-3 border-r border-zinc-800">
          <div className="text-xs text-zinc-500 uppercase tracking-wider">Volume</div>
          <div className="text-lg font-bold font-mono tabular-nums">{fmtVol(market.totalVolume)}</div>
        </div>
        <div className="text-center py-3">
          <div className="text-xs text-zinc-500 uppercase tracking-wider">Sources</div>
          <div className="text-lg font-bold font-mono tabular-nums">4</div>
        </div>
      </div>
    </div>
  );
}

// ---- compact matchup card ----
function MatchupCard({ matchup }: { matchup: Matchup }) {
  const { left, right, market } = matchup;
  const leftColor = getPartyColor(left.name);
  const rightColor = getPartyColor(right.name);
  const leftWinning = left.aggregatedPrice > right.aggregatedPrice;

  return (
    <div className="border border-zinc-800 rounded-xl bg-zinc-900 hover:border-zinc-700 transition-colors overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold">{matchup.title}</h3>
          <p className="text-xs text-zinc-500">{matchup.subtitle}</p>
        </div>
        <Swords className="w-4 h-4 text-zinc-600" />
      </div>

      {/* Fighters */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center py-4 px-4">
        <div className="text-center">
          <ProgressRing
            value={left.aggregatedPrice}
            size={64}
            strokeWidth={4}
            color={leftColor}
            labelClass="text-xs font-bold font-mono"
            className="mx-auto mb-2"
          />
          <div className="text-sm font-bold truncate">{left.shortName || left.name}</div>
          <div className={`text-xs font-mono ${left.priceChange > 0 ? 'text-emerald-400' : left.priceChange < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
            {fmtChange(left.priceChange)}
          </div>
        </div>

        <div className="text-xs font-bold text-zinc-600 px-3">VS</div>

        <div className="text-center">
          <ProgressRing
            value={right.aggregatedPrice}
            size={64}
            strokeWidth={4}
            color={rightColor}
            labelClass="text-xs font-bold font-mono"
            className="mx-auto mb-2"
          />
          <div className="text-sm font-bold truncate">{right.shortName || right.name}</div>
          <div className={`text-xs font-mono ${right.priceChange > 0 ? 'text-emerald-400' : right.priceChange < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
            {fmtChange(right.priceChange)}
          </div>
        </div>
      </div>

      {/* Spread bar */}
      <div className="px-4 pb-3">
        <DualBar
          leftValue={left.aggregatedPrice}
          rightValue={right.aggregatedPrice}
          leftColor={leftColor}
          rightColor={rightColor}
          height="h-2.5"
        />
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
        <span>Vol: {fmtVol(market.totalVolume)}</span>
        <span className="flex items-center gap-1">
          {leftWinning
            ? <><span style={{ color: leftColor }}>{left.shortName || left.name}</span> leads</>
            : <><span style={{ color: rightColor }}>{right.shortName || right.name}</span> leads</>
          }
        </span>
      </div>
    </div>
  );
}

// ---- leaderboard ----
function Leaderboard() {
  const allContracts = mockMarkets.flatMap(m =>
    m.contracts.map(c => ({ ...c, marketName: m.name }))
  );
  const sorted = [...allContracts].sort((a, b) => b.aggregatedPrice - a.aggregatedPrice);
  const top10 = sorted.slice(0, 10);

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" /> Power Rankings
        </h3>
        <span className="text-xs text-zinc-500">Top 10 across all markets</span>
      </div>
      <div>
        {top10.map((c, i) => {
          const color = getPartyColor(c.name);
          return (
            <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
              <span className={`text-sm font-bold font-mono w-6 text-center ${
                i === 0 ? 'text-amber-400' : i === 1 ? 'text-zinc-400' : i === 2 ? 'text-orange-400' : 'text-zinc-600'
              }`}>
                {i + 1}
              </span>
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium truncate block">{c.name}</span>
                <span className="text-[10px] text-zinc-500 truncate block">{c.marketName.replace(/^(Who will win |Which party will )(win |control )?(the )?/, '').slice(0, 40)}</span>
              </div>
              <span className="text-sm font-mono font-bold tabular-nums">{fmtPct(c.aggregatedPrice)}</span>
              <span className={`text-xs font-mono tabular-nums ${c.priceChange > 0 ? 'text-emerald-400' : c.priceChange < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                {fmtChange(c.priceChange)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- quick stats bar ----
function QuickStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
      {[
        { icon: BarChart3, label: 'Matchups', value: '6', sub: 'Head-to-head' },
        { icon: Users, label: 'Candidates', value: `${mockStats.totalContracts.toLocaleString()}`, sub: 'Tracked' },
        { icon: Zap, label: 'Volume', value: fmtVol(mockStats.totalVolume), sub: '4 sources' },
        { icon: Trophy, label: 'Leader', value: mockPresidential.contracts[0].shortName || '', sub: fmtPct(mockPresidential.contracts[0].aggregatedPrice) },
      ].map(s => (
        <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <s.icon className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">{s.label}</span>
          </div>
          <div className="text-xl font-bold font-mono tabular-nums">{s.value}</div>
          <div className="text-xs text-zinc-500">{s.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ============== MAIN PAGE ==============
export default function TheArenaPage() {
  const matchups = buildMatchups();
  const featured = matchups[0];
  const rest = matchups.slice(1);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-blue-500 flex items-center justify-center">
              <Swords className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">The Arena</h1>
              <p className="text-xs text-zinc-500">Head-to-head prediction market matchups</p>
            </div>
          </div>
          <div className="text-xs text-zinc-500">
            ElectionOdds &middot; Concept 03
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
        <QuickStats />

        {/* Featured matchup */}
        <FeaturedMatchup matchup={featured} />

        {/* Matchup grid */}
        <div className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-4 flex items-center gap-2">
            <Swords className="w-3.5 h-3.5" /> All Matchups
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rest.map(m => (
              <MatchupCard key={m.id} matchup={m} />
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        <Leaderboard />

        {/* Footer */}
        <footer className="border-t border-zinc-800 mt-8 pt-6 pb-4 text-xs text-zinc-600 flex items-center justify-between">
          <span>ElectionOdds &middot; The Arena &middot; Concept 03</span>
          <span>Data from PredictIt, Kalshi, Polymarket, Smarkets</span>
        </footer>
      </div>
    </div>
  );
}
