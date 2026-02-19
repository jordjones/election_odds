'use client';

import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { TrendingUp, TrendingDown, Star, Eye, Keyboard, BarChart3, Clock, Zap } from 'lucide-react';

// --- Local fixture data (inline to avoid import resolution issues with design_review/) ---
import {
  mockMarkets, mockPresidential, mockGOPPrimary, mockDEMPrimary,
  mockPartyControl, mockHouseControl, mockSenateControl,
  generateMockChartData, mockStats
} from '@/lib/api/mock-data';

const CHART_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#a855f7', '#f97316', '#06b6d4', '#d946ef', '#84cc16'];

function formatPercent(val: number, decimals = 1) {
  return `${(val * 100).toFixed(decimals)}%`;
}
function formatVolume(vol: number) {
  if (vol >= 1e9) return `$${(vol / 1e9).toFixed(1)}B`;
  if (vol >= 1e6) return `$${(vol / 1e6).toFixed(1)}M`;
  if (vol >= 1e3) return `$${(vol / 1e3).toFixed(0)}K`;
  return `$${vol}`;
}
function formatChange(val: number) {
  const pct = (val * 100).toFixed(1);
  return val > 0 ? `+${pct}` : `${pct}`;
}

// Scrolling ticker
function MarketTicker() {
  const items = mockMarkets.flatMap(m =>
    m.contracts.slice(0, 3).map(c => ({
      name: `${c.shortName || c.name}`,
      market: m.name.replace(/^(Who will win |Which party will )(win |control )?(the )?/, '').slice(0, 25),
      price: c.aggregatedPrice,
      change: c.priceChange,
    }))
  );

  return (
    <div className="overflow-hidden whitespace-nowrap border-b border-zinc-800 bg-zinc-950">
      <div className="inline-flex animate-[scroll_60s_linear_infinite] gap-6 py-1.5 px-4">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="inline-flex items-center gap-2 text-xs font-mono">
            <span className="text-zinc-500">{item.market}</span>
            <span className="text-zinc-200 font-medium">{item.name}</span>
            <span className="text-zinc-100">{formatPercent(item.price)}</span>
            <span className={item.change > 0 ? 'text-emerald-400' : item.change < 0 ? 'text-red-400' : 'text-zinc-500'}>
              {formatChange(item.change)}
            </span>
          </span>
        ))}
      </div>
      <style>{`
        @keyframes scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

// Watchlist panel
function WatchlistPanel({ watchlist, onToggle }: { watchlist: Set<string>; onToggle: (id: string) => void }) {
  const allContracts = mockMarkets.flatMap(m =>
    m.contracts.map(c => ({ ...c, marketName: m.name }))
  );
  const watched = allContracts.filter(c => watchlist.has(c.id));

  if (watched.length === 0) {
    return (
      <div className="p-4 text-center text-zinc-500 text-sm">
        <Star className="w-5 h-5 mx-auto mb-2 opacity-50" />
        <p>Click the star icon on any candidate to add them to your watchlist.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-800">
      {watched.map(c => (
        <div key={c.id} className="flex items-center justify-between px-3 py-2 hover:bg-zinc-800/50">
          <div className="flex items-center gap-2">
            <button onClick={() => onToggle(c.id)} className="text-amber-400 hover:text-amber-300">
              <Star className="w-3.5 h-3.5 fill-current" />
            </button>
            <span className="text-sm text-zinc-200">{c.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono text-zinc-100">{formatPercent(c.aggregatedPrice)}</span>
            <span className={`text-xs font-mono ${c.priceChange > 0 ? 'text-emerald-400' : c.priceChange < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
              {formatChange(c.priceChange)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Dense data table
function DenseTable({ market, watchlist, onToggleWatch }: {
  market: typeof mockPresidential;
  watchlist: Set<string>;
  onToggleWatch: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-xs text-zinc-500 uppercase tracking-wider">
            <th className="py-2 px-2 text-left w-8"></th>
            <th className="py-2 px-2 text-left w-8">#</th>
            <th className="py-2 px-2 text-left">Candidate</th>
            <th className="py-2 px-3 text-right">Price</th>
            <th className="py-2 px-3 text-right">Chg</th>
            <th className="py-2 px-3 text-right">Volume</th>
            <th className="py-2 px-3 text-right">Spread</th>
          </tr>
        </thead>
        <tbody>
          {market.contracts.map((c, i) => {
            const bestBid = c.prices[0]?.yesBid ?? c.aggregatedPrice - 0.01;
            const bestAsk = c.prices[0]?.yesAsk ?? c.aggregatedPrice + 0.01;
            const spread = bestAsk - bestBid;
            return (
              <tr key={c.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                <td className="py-1.5 px-2">
                  <button
                    onClick={() => onToggleWatch(c.id)}
                    className={`${watchlist.has(c.id) ? 'text-amber-400' : 'text-zinc-700 hover:text-zinc-500'}`}
                  >
                    <Star className={`w-3.5 h-3.5 ${watchlist.has(c.id) ? 'fill-current' : ''}`} />
                  </button>
                </td>
                <td className="py-1.5 px-2 font-mono text-zinc-600">{i + 1}</td>
                <td className="py-1.5 px-2 text-zinc-200 font-medium">{c.name}</td>
                <td className="py-1.5 px-3 text-right font-mono font-bold text-zinc-100 tabular-nums">
                  {formatPercent(c.aggregatedPrice)}
                </td>
                <td className={`py-1.5 px-3 text-right font-mono tabular-nums ${
                  c.priceChange > 0 ? 'text-emerald-400' : c.priceChange < 0 ? 'text-red-400' : 'text-zinc-500'
                }`}>
                  {formatChange(c.priceChange)}
                </td>
                <td className="py-1.5 px-3 text-right font-mono text-zinc-400 tabular-nums">
                  {formatVolume(c.totalVolume)}
                </td>
                <td className="py-1.5 px-3 text-right font-mono text-zinc-500 tabular-nums">
                  {(spread * 100).toFixed(1)}pp
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Main chart
function CommandChart({ market }: { market: typeof mockPresidential }) {
  const chartData = generateMockChartData(market);
  const visibleContracts = chartData.contracts.slice(0, 5);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData.series}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="timestamp"
          tickFormatter={(v: string) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          stroke="#52525b"
          fontSize={10}
          tick={{ fill: '#71717a' }}
        />
        <YAxis
          tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
          stroke="#52525b"
          fontSize={10}
          tick={{ fill: '#71717a' }}
          domain={['auto', 'auto']}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#18181b',
            border: '1px solid #3f3f46',
            borderRadius: '6px',
            fontSize: '12px',
          }}
          labelFormatter={(v: string) => new Date(v).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          formatter={(value: number, name: string) => [formatPercent(value), name]}
        />
        {visibleContracts.map((name, i) => (
          <Area
            key={name}
            type="monotone"
            dataKey={`values.${name}`}
            name={name}
            stroke={CHART_COLORS[i]}
            fill={CHART_COLORS[i]}
            fillOpacity={0.05}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
            connectNulls
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Summary stat card
function StatCard({ icon: Icon, label, value, sub }: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-xs text-zinc-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-xl font-bold font-mono text-zinc-100 tabular-nums">{value}</div>
      <div className="text-xs text-zinc-500 mt-0.5">{sub}</div>
    </div>
  );
}

// Keyboard shortcuts overlay
function KeyboardHint({ show, onClose }: { show: boolean; onClose: () => void }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-sm" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
          <Keyboard className="w-5 h-5" /> Keyboard Shortcuts
        </h3>
        <div className="space-y-2 text-sm">
          {[
            ['?', 'Show shortcuts'],
            ['1–7', 'Switch market panel'],
            ['w', 'Toggle watchlist'],
            ['f', 'Toggle fullscreen chart'],
            ['←/→', 'Navigate time periods'],
          ].map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-zinc-400">{desc}</span>
              <kbd className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-xs font-mono text-zinc-300">{key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============== MAIN PAGE ==============
export default function CommandCenterPage() {
  const [selectedMarket, setSelectedMarket] = useState(mockPresidential);
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [activePanel, setActivePanel] = useState<'chart' | 'watchlist'>('chart');

  // Load watchlist from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('eo-watchlist');
      if (saved) setWatchlist(new Set(JSON.parse(saved)));
    } catch {}
  }, []);

  const toggleWatch = (id: string) => {
    setWatchlist(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem('eo-watchlist', JSON.stringify([...next]));
      return next;
    });
  };

  // Keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?') setShowShortcuts(s => !s);
      if (e.key === 'w') setActivePanel(p => p === 'watchlist' ? 'chart' : 'watchlist');
      if (e.key === 'Escape') setShowShortcuts(false);
      const markets = [mockPresidential, mockGOPPrimary, mockDEMPrimary, mockPartyControl, mockHouseControl, mockSenateControl];
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < markets.length) setSelectedMarket(markets[idx]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const markets = [
    { market: mockPresidential, label: 'Presidential', shortLabel: 'PRES' },
    { market: mockGOPPrimary, label: 'GOP Primary', shortLabel: 'GOP' },
    { market: mockDEMPrimary, label: 'DEM Primary', shortLabel: 'DEM' },
    { market: mockPartyControl, label: 'Party Control', shortLabel: 'PARTY' },
    { market: mockHouseControl, label: 'House 2026', shortLabel: 'HOUSE' },
    { market: mockSenateControl, label: 'Senate 2026', shortLabel: 'SEN' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 flex flex-col">
      {/* Header bar */}
      <header className="border-b border-zinc-800 bg-zinc-950 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-blue-400" />
          <span className="font-bold text-lg tracking-tight">ElectionOdds</span>
          <span className="text-xs text-zinc-600 hidden sm:inline">COMMAND CENTER</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-zinc-500">
            <Clock className="w-3.5 h-3.5" />
            {new Date().toLocaleTimeString()}
          </span>
          <button
            onClick={() => setShowShortcuts(true)}
            className="text-zinc-600 hover:text-zinc-400 flex items-center gap-1"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <kbd className="text-[10px]">?</kbd>
          </button>
        </div>
      </header>

      {/* Ticker */}
      <MarketTicker />

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border-b border-zinc-800">
        <StatCard icon={BarChart3} label="Markets" value={mockStats.totalMarkets.toLocaleString()} sub="Active markets tracked" />
        <StatCard icon={TrendingUp} label="Volume" value={formatVolume(mockStats.totalVolume)} sub="Total across all sources" />
        <StatCard icon={Eye} label="Sources" value="4" sub="PredictIt, Kalshi, Poly, Smarkets" />
        <StatCard icon={Star} label="Watching" value={watchlist.size.toString()} sub="In your watchlist" />
      </div>

      {/* Market tabs */}
      <div className="flex overflow-x-auto border-b border-zinc-800 bg-zinc-950">
        {markets.map(({ market, label, shortLabel }) => (
          <button
            key={market.id}
            onClick={() => setSelectedMarket(market)}
            className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
              selectedMarket.id === market.id
                ? 'border-blue-500 text-blue-400 bg-zinc-900'
                : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
            }`}
          >
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{shortLabel}</span>
          </button>
        ))}
      </div>

      {/* Main content: split layout */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left: Table */}
        <div className="lg:w-[45%] border-r border-zinc-800 overflow-y-auto">
          <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-300">{selectedMarket.name}</h2>
            <span className="text-xs text-zinc-600">{selectedMarket.contracts.length} contracts</span>
          </div>
          <DenseTable market={selectedMarket} watchlist={watchlist} onToggleWatch={toggleWatch} />
        </div>

        {/* Right: Chart + Watchlist */}
        <div className="flex-1 flex flex-col">
          {/* Panel toggle */}
          <div className="flex border-b border-zinc-800">
            <button
              onClick={() => setActivePanel('chart')}
              className={`px-4 py-2 text-xs font-medium ${activePanel === 'chart' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-zinc-500'}`}
            >
              Chart
            </button>
            <button
              onClick={() => setActivePanel('watchlist')}
              className={`px-4 py-2 text-xs font-medium flex items-center gap-1.5 ${activePanel === 'watchlist' ? 'text-amber-400 border-b-2 border-amber-500' : 'text-zinc-500'}`}
            >
              <Star className="w-3 h-3" />
              Watchlist ({watchlist.size})
            </button>
          </div>

          {/* Panel content */}
          <div className="flex-1 p-4">
            {activePanel === 'chart' ? (
              <CommandChart market={selectedMarket} />
            ) : (
              <WatchlistPanel watchlist={watchlist} onToggle={toggleWatch} />
            )}
          </div>

          {/* Bottom: quick market summary */}
          <div className="border-t border-zinc-800 p-3">
            <div className="grid grid-cols-3 gap-4">
              {selectedMarket.contracts.slice(0, 3).map((c, i) => (
                <div key={c.id} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                  <span className="text-xs text-zinc-400 truncate">{c.shortName || c.name}</span>
                  <span className="text-xs font-mono text-zinc-200 ml-auto">{formatPercent(c.aggregatedPrice)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard shortcuts modal */}
      <KeyboardHint show={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
}
