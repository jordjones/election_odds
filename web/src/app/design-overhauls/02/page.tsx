'use client';

import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Newspaper, TrendingUp, TrendingDown, ChevronRight,
  Clock, BarChart3, AlertTriangle, Bookmark, Share2,
} from 'lucide-react';
import {
  mockMarkets, mockPresidential, mockGOPPrimary, mockDEMPrimary,
  mockPartyControl, mockHouseControl, mockSenateControl,
  generateMockChartData, mockStats,
} from '@/lib/api/mock-data';
import { getPartyColor, getPartyId } from '../_components/PartyColor';
import { HorizontalBar } from '../_components/HorizontalBar';

// ---- helpers ----
function fmtPct(v: number, d = 1) { return `${(v * 100).toFixed(d)}%`; }
function fmtChange(v: number) { const p = (v * 100).toFixed(1); return v > 0 ? `+${p}` : `${p}`; }
function fmtVol(v: number) {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v}`;
}
function timeAgo() {
  const mins = Math.floor(Math.random() * 45) + 5;
  return `${mins} min ago`;
}

// ---- masthead ----
function Masthead() {
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <header className="border-b-4 border-double border-zinc-800 pb-3 mb-6">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-[0.3em] text-zinc-500 font-medium">{dateStr}</div>
        <div className="flex items-center gap-3">
          <button className="text-zinc-500 hover:text-zinc-300"><Bookmark className="w-4 h-4" /></button>
          <button className="text-zinc-500 hover:text-zinc-300"><Share2 className="w-4 h-4" /></button>
        </div>
      </div>
      <h1 className="text-4xl md:text-5xl font-black tracking-tight mt-2 font-serif" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
        The Election Briefing
      </h1>
      <p className="text-sm text-zinc-500 mt-1 italic" style={{ fontFamily: 'Georgia, serif' }}>
        Prediction market intelligence for the newsroom &middot; Updated every 5 minutes
      </p>
    </header>
  );
}

// ---- headline card ----
function HeadlineStory() {
  const leader = mockPresidential.contracts[0];
  const runner = mockPresidential.contracts[1];
  const chartData = generateMockChartData(mockPresidential);

  return (
    <article className="border-b border-zinc-800 pb-6 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider rounded">
          Lead Story
        </span>
        <span className="text-xs text-zinc-500"><Clock className="w-3 h-3 inline mr-1" />{timeAgo()}</span>
      </div>
      <h2 className="text-2xl md:text-3xl font-bold leading-tight mb-3" style={{ fontFamily: 'Georgia, serif' }}>
        {leader.name} leads 2028 presidential market at {fmtPct(leader.aggregatedPrice, 0)},
        {' '}{runner.name} trails at {fmtPct(runner.aggregatedPrice, 0)}
      </h2>
      <p className="text-zinc-400 leading-relaxed mb-4 max-w-2xl" style={{ fontFamily: 'Georgia, serif' }}>
        Across four major prediction markets, {leader.name} maintains the top position with
        an aggregated probability of {fmtPct(leader.aggregatedPrice)}, reflecting a
        {' '}<span className={leader.priceChange >= 0 ? 'text-emerald-400' : 'text-red-400'}>{fmtChange(leader.priceChange)}</span>
        {' '}shift over 24 hours. Total volume across all presidential contracts has reached {fmtVol(mockPresidential.totalVolume)}.
      </p>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-4">
        <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3 font-medium">30-Day Trend &mdash; Presidential</div>
        <ResponsiveContainer width="100%" height={200}>
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
              labelFormatter={(v: string) => new Date(v).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              formatter={(value: number, name: string) => [fmtPct(value), name]}
            />
            {chartData.contracts.slice(0, 3).map((name, i) => (
              <Area
                key={name} type="monotone"
                dataKey={`values.${name}`} name={name}
                stroke={getPartyColor(name)}
                fill={getPartyColor(name)}
                fillOpacity={0.08} strokeWidth={2}
                dot={false} isAnimationActive={false} connectNulls
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

// ---- market brief card ----
function MarketBrief({ market, accent }: { market: typeof mockPresidential; accent?: string }) {
  const leader = market.contracts[0];
  const leaderColor = getPartyColor(leader.name);

  return (
    <div className="border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-bold leading-tight flex-1" style={{ fontFamily: 'Georgia, serif' }}>
          {market.name.replace(/^(Who will win |Which party will )(win |control )?(the )?/, '')}
        </h3>
        <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
      </div>
      {market.contracts.slice(0, 3).map(c => (
        <div key={c.id} className="mb-2 last:mb-0">
          <div className="flex items-center justify-between text-sm mb-0.5">
            <span className="text-zinc-300">{c.shortName || c.name}</span>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono ${c.priceChange > 0 ? 'text-emerald-400' : c.priceChange < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                {fmtChange(c.priceChange)}
              </span>
              <span className="font-mono font-bold text-sm tabular-nums">{fmtPct(c.aggregatedPrice)}</span>
            </div>
          </div>
          <HorizontalBar value={c.aggregatedPrice} color={getPartyColor(c.name)} height="h-1.5" />
        </div>
      ))}
      <div className="mt-3 pt-2 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
        <span>Vol: {fmtVol(market.totalVolume)}</span>
        <span>{market.contracts.length} contracts</span>
      </div>
    </div>
  );
}

// ---- market movers (biggest changes) ----
function MarketMovers() {
  const allContracts = mockMarkets.flatMap(m =>
    m.contracts.map(c => ({ ...c, market: m.name }))
  );
  const sorted = [...allContracts].sort((a, b) => Math.abs(b.priceChange) - Math.abs(a.priceChange));
  const movers = sorted.slice(0, 6);

  return (
    <div className="border border-zinc-800 rounded-lg p-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
        <AlertTriangle className="w-3.5 h-3.5" /> Biggest Movers (24h)
      </h3>
      <div className="space-y-2">
        {movers.map(c => (
          <div key={c.id} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {c.priceChange > 0
                ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                : <TrendingDown className="w-3.5 h-3.5 text-red-400 shrink-0" />
              }
              <span className="text-zinc-300 truncate">{c.name}</span>
            </div>
            <div className="flex items-center gap-3 ml-2">
              <span className="font-mono text-xs text-zinc-400 tabular-nums">{fmtPct(c.aggregatedPrice)}</span>
              <span className={`font-mono text-xs font-bold tabular-nums ${c.priceChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmtChange(c.priceChange)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- source breakdown sidebar ----
function SourceBreakdown() {
  const sources = [
    { name: 'Polymarket', count: mockStats.sourceBreakdown.Polymarket, color: '#8b5cf6' },
    { name: 'PredictIt', count: mockStats.sourceBreakdown.PredictIt, color: '#06b6d4' },
    { name: 'Kalshi', count: mockStats.sourceBreakdown.Kalshi, color: '#f97316' },
    { name: 'Smarkets', count: mockStats.sourceBreakdown.Smarkets, color: '#22c55e' },
  ];
  const max = Math.max(...sources.map(s => s.count));

  return (
    <div className="border border-zinc-800 rounded-lg p-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3 flex items-center gap-2">
        <BarChart3 className="w-3.5 h-3.5" /> Sources
      </h3>
      <div className="space-y-3">
        {sources.map(s => (
          <div key={s.name}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-zinc-300">{s.name}</span>
              <span className="font-mono text-xs text-zinc-500">{s.count} markets</span>
            </div>
            <HorizontalBar value={s.count / max} color={s.color} height="h-1" />
          </div>
        ))}
      </div>
      <div className="mt-3 pt-2 border-t border-zinc-800 text-xs text-zinc-500">
        Total: {mockStats.totalMarkets.toLocaleString()} markets &middot; {fmtVol(mockStats.totalVolume)} volume
      </div>
    </div>
  );
}

// ---- wire-style news ticker ----
function WireTicker() {
  const items = [
    { text: `Presidential market: ${mockPresidential.contracts[0].name} holds at ${fmtPct(mockPresidential.contracts[0].aggregatedPrice)}`, time: '2m' },
    { text: `House 2026: Democrats favored at ${fmtPct(mockHouseControl.contracts[0].aggregatedPrice)}`, time: '8m' },
    { text: `GOP Primary: ${mockGOPPrimary.contracts[0].name} dominant at ${fmtPct(mockGOPPrimary.contracts[0].aggregatedPrice)}`, time: '15m' },
    { text: `Senate 2026: GOP holds edge at ${fmtPct(mockSenateControl.contracts[0].aggregatedPrice)}`, time: '22m' },
    { text: `DEM Primary: ${mockDEMPrimary.contracts[0].name} leads pack at ${fmtPct(mockDEMPrimary.contracts[0].aggregatedPrice)}`, time: '31m' },
  ];

  return (
    <div className="border-y border-zinc-800 bg-zinc-950 py-2 mb-6">
      <div className="flex items-center gap-3 px-4">
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 shrink-0 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Wire
        </span>
        <div className="overflow-hidden whitespace-nowrap flex-1">
          <div className="inline-flex gap-8 animate-[scroll_40s_linear_infinite]">
            {[...items, ...items].map((item, i) => (
              <span key={i} className="text-xs text-zinc-400">
                <span className="text-zinc-600">{item.time}</span>
                {' '}&mdash;{' '}
                {item.text}
              </span>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  );
}

// ============== MAIN PAGE ==============
export default function ElectionBriefingPage() {
  const [section, setSection] = useState<'all' | 'presidential' | 'midterms' | 'primaries'>('all');

  const sections = [
    { id: 'all' as const, label: 'All Stories' },
    { id: 'presidential' as const, label: 'Presidential' },
    { id: 'midterms' as const, label: 'Midterms' },
    { id: 'primaries' as const, label: 'Primaries' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
        <Masthead />
        <WireTicker />

        {/* Section tabs */}
        <nav className="flex gap-1 mb-6 border-b border-zinc-800">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                section === s.id
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {s.label}
            </button>
          ))}
        </nav>

        {/* Main grid: 2/3 content, 1/3 sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          {/* Main column */}
          <div>
            <HeadlineStory />

            {/* Market briefs grid */}
            <div className="mb-6">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-4" style={{ fontFamily: 'Georgia, serif' }}>
                Market Briefs
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(section === 'all' || section === 'midterms') && (
                  <>
                    <MarketBrief market={mockHouseControl} />
                    <MarketBrief market={mockSenateControl} />
                  </>
                )}
                {(section === 'all' || section === 'presidential') && (
                  <MarketBrief market={mockPartyControl} />
                )}
                {(section === 'all' || section === 'primaries') && (
                  <>
                    <MarketBrief market={mockGOPPrimary} />
                    <MarketBrief market={mockDEMPrimary} />
                  </>
                )}
              </div>
            </div>

            {/* Full contract table */}
            <div className="border border-zinc-800 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-sm font-bold" style={{ fontFamily: 'Georgia, serif' }}>
                  Presidential Odds &mdash; Full Table
                </h2>
                <span className="text-xs text-zinc-500">{mockPresidential.contracts.length} candidates</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
                    <th className="py-2 px-4 text-left">#</th>
                    <th className="py-2 px-4 text-left">Candidate</th>
                    <th className="py-2 px-4 text-left">Party</th>
                    <th className="py-2 px-4 text-right">Odds</th>
                    <th className="py-2 px-4 text-right">24h</th>
                    <th className="py-2 px-4 text-right">Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {mockPresidential.contracts.map((c, i) => {
                    const party = getPartyId(c.name);
                    const color = getPartyColor(c.name);
                    return (
                      <tr key={c.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-zinc-600">{i + 1}</td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                            <span className="font-medium">{c.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-xs" style={{ color }}>{party === 'gop' ? 'R' : party === 'dem' ? 'D' : 'I'}</td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold tabular-nums">{fmtPct(c.aggregatedPrice)}</td>
                        <td className={`py-2.5 px-4 text-right font-mono tabular-nums ${c.priceChange > 0 ? 'text-emerald-400' : c.priceChange < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                          {fmtChange(c.priceChange)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-zinc-400 tabular-nums">{fmtVol(c.totalVolume)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Key numbers */}
            <div className="border border-zinc-800 rounded-lg p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3" style={{ fontFamily: 'Georgia, serif' }}>
                By The Numbers
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-zinc-400">Active Markets</span>
                  <span className="text-xl font-bold font-mono">{mockStats.totalMarkets}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-zinc-400">Total Volume</span>
                  <span className="text-xl font-bold font-mono">{fmtVol(mockStats.totalVolume)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-zinc-400">Sources</span>
                  <span className="text-xl font-bold font-mono">4</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-zinc-400">Contracts</span>
                  <span className="text-xl font-bold font-mono">{mockStats.totalContracts.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <MarketMovers />
            <SourceBreakdown />

            {/* Methodology note */}
            <div className="border border-zinc-800 rounded-lg p-4 text-xs text-zinc-500" style={{ fontFamily: 'Georgia, serif' }}>
              <h3 className="font-bold uppercase tracking-wider mb-2 text-zinc-400">Methodology</h3>
              <p className="leading-relaxed">
                Probabilities are volume-weighted averages across PredictIt, Kalshi, Polymarket, and Smarkets.
                Data refreshes every 5 minutes. Past performance does not guarantee future accuracy.
              </p>
            </div>
          </aside>
        </div>

        {/* Footer */}
        <footer className="border-t border-zinc-800 mt-8 pt-6 pb-4 text-xs text-zinc-600 flex items-center justify-between" style={{ fontFamily: 'Georgia, serif' }}>
          <span>ElectionOdds &middot; The Election Briefing &middot; Concept 02</span>
          <span>Data from PredictIt, Kalshi, Polymarket, Smarkets</span>
        </footer>
      </div>
    </div>
  );
}
