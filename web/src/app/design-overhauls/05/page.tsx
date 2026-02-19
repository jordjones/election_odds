'use client';

import { useState, useEffect } from 'react';
import {
  LineChart, Line, ResponsiveContainer, YAxis,
} from 'recharts';
import {
  Flame, TrendingUp, TrendingDown, Share2, Bookmark,
  MessageCircle, ChevronUp, ChevronDown as ChevDown, RefreshCw,
  Zap, Eye, Heart, BarChart3, ArrowUp, Filter,
} from 'lucide-react';
import {
  mockMarkets, mockPresidential, mockGOPPrimary, mockDEMPrimary,
  mockPartyControl, mockHouseControl, mockSenateControl,
  generateMockChartData, mockStats,
} from '@/lib/api/mock-data';
import { getPartyColor, getPartyId, getPartyLabel } from '../_components/PartyColor';
import { HorizontalBar } from '../_components/HorizontalBar';
import { ProgressRing } from '../_components/ProgressRing';
import type { Market, Contract } from '@/lib/types';

// ---- helpers ----
function fmtPct(v: number, d = 1) { return `${(v * 100).toFixed(d)}%`; }
function fmtChange(v: number) { const p = (v * 100).toFixed(1); return v > 0 ? `+${p}` : `${p}`; }
function fmtVol(v: number) {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v}`;
}
function timeAgo(mins: number) {
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h`;
}

// ---- feed card types ----
type FeedCardType = 'alert' | 'market' | 'mover' | 'milestone' | 'comparison';

interface FeedItem {
  id: string;
  type: FeedCardType;
  timestamp: number; // minutes ago
  market: Market;
  contract?: Contract;
  headline: string;
  detail?: string;
}

function generateFeed(): FeedItem[] {
  const items: FeedItem[] = [
    {
      id: 'f1', type: 'alert', timestamp: 2,
      market: mockPresidential, contract: mockPresidential.contracts[0],
      headline: `${mockPresidential.contracts[0].name} holds steady at ${fmtPct(mockPresidential.contracts[0].aggregatedPrice)}`,
      detail: 'Leading across all 4 prediction markets for 2028 presidential odds.',
    },
    {
      id: 'f2', type: 'mover', timestamp: 8,
      market: mockDEMPrimary, contract: mockDEMPrimary.contracts[1],
      headline: `${mockDEMPrimary.contracts[1].name} surges ${fmtChange(mockDEMPrimary.contracts[1].priceChange)} in DEM primary`,
      detail: `Now at ${fmtPct(mockDEMPrimary.contracts[1].aggregatedPrice)}, the biggest mover in the Democratic field today.`,
    },
    {
      id: 'f3', type: 'market', timestamp: 15,
      market: mockHouseControl,
      headline: `House 2026: Democrats favored at ${fmtPct(mockHouseControl.contracts[0].aggregatedPrice)}`,
      detail: `Volume: ${fmtVol(mockHouseControl.totalVolume)}. Democrats lead Republicans by ${((mockHouseControl.contracts[0].aggregatedPrice - mockHouseControl.contracts[1].aggregatedPrice) * 100).toFixed(0)} points.`,
    },
    {
      id: 'f4', type: 'milestone', timestamp: 23,
      market: mockGOPPrimary, contract: mockGOPPrimary.contracts[0],
      headline: `${mockGOPPrimary.contracts[0].name} near 50% in GOP primary`,
      detail: `At ${fmtPct(mockGOPPrimary.contracts[0].aggregatedPrice)}, the VP is consolidating the Republican field early.`,
    },
    {
      id: 'f5', type: 'comparison', timestamp: 31,
      market: mockSenateControl,
      headline: `Senate 2026: GOP maintains edge at ${fmtPct(mockSenateControl.contracts[0].aggregatedPrice)}`,
      detail: `Republicans favored to hold the Senate. Map remains challenging for Democrats with limited pickup opportunities.`,
    },
    {
      id: 'f6', type: 'mover', timestamp: 45,
      market: mockPresidential, contract: mockPresidential.contracts[1],
      headline: `${mockPresidential.contracts[1].name} rises to #2 in presidential odds`,
      detail: `Up ${fmtChange(mockPresidential.contracts[1].priceChange)} today to ${fmtPct(mockPresidential.contracts[1].aggregatedPrice)}.`,
    },
    {
      id: 'f7', type: 'market', timestamp: 52,
      market: mockPartyControl,
      headline: `Party control: Democrats slight favorites at ${fmtPct(mockPartyControl.contracts[0].aggregatedPrice)}`,
      detail: `The closest major market — just ${((mockPartyControl.contracts[0].aggregatedPrice - mockPartyControl.contracts[1].aggregatedPrice) * 100).toFixed(0)} points separate the parties.`,
    },
    {
      id: 'f8', type: 'alert', timestamp: 68,
      market: mockDEMPrimary, contract: mockDEMPrimary.contracts[0],
      headline: `${mockDEMPrimary.contracts[0].name} leads wide-open DEM primary`,
      detail: `At ${fmtPct(mockDEMPrimary.contracts[0].aggregatedPrice)}, no Democrat has broken away from the pack.`,
    },
  ];

  return items.sort((a, b) => a.timestamp - b.timestamp);
}

// ---- inline sparkline ----
function Sparkline({ contract, color }: { contract: Contract; color: string }) {
  const chartData = Array.from({ length: 14 }, (_, i) => ({
    value: contract.aggregatedPrice + (Math.random() - 0.5) * 0.08 * ((14 - i) / 14),
  }));

  const values = chartData.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.1 || 0.01;

  return (
    <ResponsiveContainer width={72} height={28}>
      <LineChart data={chartData}>
        <YAxis domain={[min - pad, max + pad]} hide />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ---- type badge ----
function TypeBadge({ type }: { type: FeedCardType }) {
  const config = {
    alert: { bg: 'bg-red-500/20', text: 'text-red-400', icon: Zap, label: 'Alert' },
    market: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: BarChart3, label: 'Market' },
    mover: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: TrendingUp, label: 'Mover' },
    milestone: { bg: 'bg-amber-500/20', text: 'text-amber-400', icon: Flame, label: 'Milestone' },
    comparison: { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: Eye, label: 'Compare' },
  }[type];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${config.bg} ${config.text}`}>
      <Icon className="w-3 h-3" /> {config.label}
    </span>
  );
}

// ---- feed card ----
function FeedCard({ item, onLike }: { item: FeedItem; onLike: () => void }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const contract = item.contract || item.market.contracts[0];
  const color = getPartyColor(contract.name);

  return (
    <article className="border border-zinc-800 rounded-2xl bg-zinc-900 overflow-hidden hover:border-zinc-700 transition-all">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <TypeBadge type={item.type} />
          <span className="text-xs text-zinc-500">{timeAgo(item.timestamp)}</span>
        </div>
        <button
          onClick={() => setSaved(!saved)}
          className={`${saved ? 'text-amber-400' : 'text-zinc-600 hover:text-zinc-400'} transition-colors`}
        >
          <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <h3 className="text-base font-bold leading-snug mb-1">{item.headline}</h3>
        {item.detail && <p className="text-sm text-zinc-400 leading-relaxed">{item.detail}</p>}
      </div>

      {/* Data strip */}
      <div className="px-4 pb-3">
        <div className="bg-zinc-950 rounded-xl p-3 flex items-center gap-4">
          <ProgressRing
            value={contract.aggregatedPrice}
            size={48}
            strokeWidth={4}
            color={color}
            labelClass="text-[10px] font-bold font-mono"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold truncate">{contract.name}</span>
              <span className="text-xs font-mono font-bold tabular-nums">{fmtPct(contract.aggregatedPrice)}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-mono ${contract.priceChange > 0 ? 'text-emerald-400' : contract.priceChange < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                {contract.priceChange > 0 ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />}
                {' '}{fmtChange(contract.priceChange)}
              </span>
              <span className="text-xs text-zinc-500">Vol: {fmtVol(contract.totalVolume)}</span>
            </div>
          </div>
          <Sparkline contract={contract} color={color} />
        </div>
      </div>

      {/* Market mini-table for market-type cards */}
      {(item.type === 'market' || item.type === 'comparison') && (
        <div className="px-4 pb-3">
          <div className="space-y-1.5">
            {item.market.contracts.slice(0, 3).map(c => (
              <div key={c.id} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getPartyColor(c.name) }} />
                <span className="text-xs text-zinc-400 flex-1 truncate">{c.shortName || c.name}</span>
                <HorizontalBar value={c.aggregatedPrice} color={getPartyColor(c.name)} height="h-1" className="w-16" />
                <span className="text-xs font-mono tabular-nums">{fmtPct(c.aggregatedPrice, 0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Social actions */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-800">
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setLiked(!liked); onLike(); }}
            className={`flex items-center gap-1 text-xs ${liked ? 'text-red-400' : 'text-zinc-500 hover:text-zinc-300'} transition-colors`}
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
            <span>{liked ? Math.floor(Math.random() * 200) + 51 : Math.floor(Math.random() * 200) + 50}</span>
          </button>
          <button className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            <MessageCircle className="w-4 h-4" />
            <span>{Math.floor(Math.random() * 30)}</span>
          </button>
        </div>
        <button className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <Share2 className="w-4 h-4" />
        </button>
      </div>
    </article>
  );
}

// ---- trending sidebar ----
function TrendingSidebar() {
  const allContracts = mockMarkets.flatMap(m =>
    m.contracts.slice(0, 3).map(c => ({ ...c, marketName: m.name }))
  );
  const sorted = [...allContracts].sort((a, b) => Math.abs(b.priceChange) - Math.abs(a.priceChange));
  const trending = sorted.slice(0, 8);

  return (
    <div className="border border-zinc-800 rounded-2xl bg-zinc-900 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
        <Flame className="w-4 h-4 text-orange-400" />
        <h3 className="text-sm font-bold">Trending</h3>
      </div>
      <div>
        {trending.map((c, i) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
            <span className="text-xs font-mono text-zinc-600 w-4">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium truncate block">{c.name}</span>
              <span className="text-[10px] text-zinc-500 truncate block">
                {c.marketName.replace(/^(Who will win |Which party will )(win |control )?(the )?/, '').slice(0, 30)}
              </span>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono font-bold tabular-nums">{fmtPct(c.aggregatedPrice, 0)}</div>
              <div className={`text-[10px] font-mono tabular-nums ${c.priceChange > 0 ? 'text-emerald-400' : c.priceChange < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                {fmtChange(c.priceChange)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- quick stats strip ----
function StatsStrip() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 mb-4">
      {[
        { label: 'Markets', value: mockStats.totalMarkets.toString(), icon: BarChart3 },
        { label: 'Volume', value: fmtVol(mockStats.totalVolume), icon: TrendingUp },
        { label: 'Sources', value: '4', icon: Eye },
        { label: 'Leader', value: mockPresidential.contracts[0].shortName || '', icon: Flame },
      ].map(s => (
        <div key={s.label} className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl shrink-0">
          <s.icon className="w-3.5 h-3.5 text-zinc-500" />
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{s.label}</div>
            <div className="text-sm font-bold font-mono tabular-nums">{s.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============== MAIN PAGE ==============
export default function LiveWirePage() {
  const [feed] = useState(generateFeed);
  const [filter, setFilter] = useState<FeedCardType | 'all'>('all');
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handler = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const filtered = filter === 'all' ? feed : feed.filter(f => f.type === filter);

  const filterOptions: { id: FeedCardType | 'all'; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'alert', label: 'Alerts' },
    { id: 'mover', label: 'Movers' },
    { id: 'market', label: 'Markets' },
    { id: 'milestone', label: 'Milestones' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight">Live Wire</h1>
              <p className="text-[10px] text-zinc-500 leading-none">Real-time election odds feed</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
            <button className="text-zinc-500 hover:text-zinc-300 p-1">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Filter chips */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {filterOptions.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-colors ${
                filter === f.id
                  ? 'bg-zinc-200 text-zinc-900'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <StatsStrip />

        {/* Main layout: feed + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          {/* Feed */}
          <div className="space-y-4">
            {filtered.map(item => (
              <FeedCard key={item.id} item={item} onLike={() => {}} />
            ))}

            {/* End of feed */}
            <div className="text-center py-8 text-zinc-600 text-sm">
              <RefreshCw className="w-5 h-5 mx-auto mb-2 opacity-50" />
              <p>You&apos;re all caught up!</p>
              <p className="text-xs mt-1">New updates appear automatically</p>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block space-y-4">
            <TrendingSidebar />

            {/* Quick snapshot */}
            <div className="border border-zinc-800 rounded-2xl bg-zinc-900 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Quick Snapshot</h3>
              <div className="space-y-3">
                {mockPresidential.contracts.slice(0, 4).map(c => (
                  <div key={c.id} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getPartyColor(c.name) }} />
                    <span className="text-xs text-zinc-400 flex-1 truncate">{c.shortName || c.name}</span>
                    <span className="text-xs font-mono font-bold tabular-nums">{fmtPct(c.aggregatedPrice, 0)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* About */}
            <div className="border border-zinc-800 rounded-2xl bg-zinc-900 p-4 text-xs text-zinc-500">
              <p className="leading-relaxed">
                Live Wire delivers real-time election odds from 4 prediction markets.
                Follow the latest movements, alerts, and milestones.
              </p>
              <p className="mt-2 text-zinc-600">ElectionOdds &middot; Concept 05</p>
            </div>
          </aside>
        </div>
      </div>

      {/* Scroll to top button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:bg-zinc-700 transition-colors shadow-lg z-50"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
