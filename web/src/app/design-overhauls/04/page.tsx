'use client';

import { useState } from 'react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, ReferenceLine,
} from 'recharts';
import {
  Activity, TrendingUp, TrendingDown, BarChart3,
  PieChart, Target, ChevronDown, Info, Layers,
  GitBranch, AlertCircle, CheckCircle,
} from 'lucide-react';
import {
  mockMarkets, mockPresidential, mockGOPPrimary, mockDEMPrimary,
  mockPartyControl, mockHouseControl, mockSenateControl,
  generateMockChartData, mockStats, mockTrackRecord,
} from '@/lib/api/mock-data';
import { getPartyColor, getPartyId, getPartyLabel } from '../_components/PartyColor';
import { HorizontalBar, DualBar } from '../_components/HorizontalBar';
import { ProgressRing } from '../_components/ProgressRing';

// ---- helpers ----
function fmtPct(v: number, d = 1) { return `${(v * 100).toFixed(d)}%`; }
function fmtChange(v: number) { const p = (v * 100).toFixed(1); return v > 0 ? `+${p}` : `${p}`; }
function fmtVol(v: number) {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v}`;
}

// ---- main forecast panel ----
function ForecastPanel() {
  const dem = mockPartyControl.contracts.find(c => c.name.includes('Democratic'))!;
  const gop = mockPartyControl.contracts.find(c => c.name.includes('Republican'))!;
  const chartData = generateMockChartData(mockPartyControl);
  const demColor = getPartyColor('dem');
  const gopColor = getPartyColor('gop');

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900">
      {/* Header */}
      <div className="p-5 pb-0">
        <div className="flex items-center gap-2 mb-1">
          <Target className="w-4 h-4 text-zinc-400" />
          <span className="text-xs uppercase tracking-wider font-bold text-zinc-400">2028 Presidential Forecast</span>
        </div>
        <h2 className="text-2xl font-bold mb-1">Who will win the presidency?</h2>
        <p className="text-sm text-zinc-400 mb-4">Aggregated from 4 prediction markets as of {new Date().toLocaleDateString()}</p>
      </div>

      {/* Big probabilities */}
      <div className="grid grid-cols-2 gap-0">
        <div className="p-5 text-center border-r border-zinc-800" style={{ borderBottom: `3px solid ${demColor}` }}>
          <div className="text-4xl md:text-5xl font-black font-mono tabular-nums" style={{ color: demColor }}>
            {(dem.aggregatedPrice * 100).toFixed(0)}
          </div>
          <div className="text-xs text-zinc-500 mt-1">in 100</div>
          <div className="text-sm font-bold mt-2" style={{ color: demColor }}>Democrat wins</div>
          <div className={`text-xs font-mono mt-1 ${dem.priceChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {fmtChange(dem.priceChange)} today
          </div>
        </div>
        <div className="p-5 text-center" style={{ borderBottom: `3px solid ${gopColor}` }}>
          <div className="text-4xl md:text-5xl font-black font-mono tabular-nums" style={{ color: gopColor }}>
            {(gop.aggregatedPrice * 100).toFixed(0)}
          </div>
          <div className="text-xs text-zinc-500 mt-1">in 100</div>
          <div className="text-sm font-bold mt-2" style={{ color: gopColor }}>Republican wins</div>
          <div className={`text-xs font-mono mt-1 ${gop.priceChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {fmtChange(gop.priceChange)} today
          </div>
        </div>
      </div>

      {/* Trend chart */}
      <div className="p-4">
        <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2 font-medium">Probability Over Time</div>
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
              domain={[0.3, 0.7]}
            />
            <ReferenceLine y={0.5} stroke="#52525b" strokeDasharray="8 4" />
            <Tooltip
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '6px', fontSize: '12px' }}
              formatter={(value: number, name: string) => [fmtPct(value), name]}
            />
            <Area type="monotone" dataKey={`values.${dem.name}`} name="Democrat"
              stroke={demColor} fill={demColor} fillOpacity={0.1} strokeWidth={2}
              dot={false} isAnimationActive={false} connectNulls />
            <Area type="monotone" dataKey={`values.${gop.name}`} name="Republican"
              stroke={gopColor} fill={gopColor} fillOpacity={0.1} strokeWidth={2}
              dot={false} isAnimationActive={false} connectNulls />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ---- candidate probability table ----
function CandidateTable({ market, title }: { market: typeof mockPresidential; title: string }) {
  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <h3 className="text-sm font-bold">{title}</h3>
        <span className="text-xs text-zinc-500">{market.contracts.length} candidates</span>
      </div>
      <div>
        {market.contracts.map((c, i) => {
          const color = getPartyColor(c.name);
          const party = getPartyId(c.name);
          return (
            <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
              <span className="text-xs font-mono text-zinc-600 w-5">{i + 1}</span>
              <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{
                    backgroundColor: `${color}20`,
                    color: color,
                  }}>
                    {party === 'gop' ? 'R' : party === 'dem' ? 'D' : 'I'}
                  </span>
                </div>
                <HorizontalBar value={c.aggregatedPrice} color={color} height="h-1" className="mt-1" />
              </div>
              <div className="text-right">
                <div className="text-sm font-mono font-bold tabular-nums">{fmtPct(c.aggregatedPrice)}</div>
                <div className={`text-[10px] font-mono tabular-nums ${c.priceChange > 0 ? 'text-emerald-400' : c.priceChange < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                  {fmtChange(c.priceChange)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- control forecast bars ----
function ControlForecasts() {
  const races = [
    { label: 'House 2026', market: mockHouseControl },
    { label: 'Senate 2026', market: mockSenateControl },
    { label: 'Presidency 2028', market: mockPartyControl },
  ];

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Layers className="w-4 h-4 text-zinc-400" /> Control Forecasts
        </h3>
      </div>
      <div className="p-4 space-y-5">
        {races.map(r => {
          const dem = r.market.contracts.find(c => c.name.includes('Democratic') || c.name.includes('Dem'));
          const gop = r.market.contracts.find(c => c.name.includes('Republican') || c.name.includes('GOP'));
          if (!dem || !gop) return null;
          const demLeads = dem.aggregatedPrice > gop.aggregatedPrice;

          return (
            <div key={r.label}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{r.label}</span>
                <span className="text-xs font-mono" style={{ color: demLeads ? getPartyColor('dem') : getPartyColor('gop') }}>
                  {demLeads ? 'D' : 'R'} +{((Math.abs(dem.aggregatedPrice - gop.aggregatedPrice)) * 100).toFixed(0)}
                </span>
              </div>
              <DualBar
                leftValue={dem.aggregatedPrice}
                rightValue={gop.aggregatedPrice}
                leftColor={getPartyColor('dem')}
                rightColor={getPartyColor('gop')}
                height="h-3"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                <span>DEM {fmtPct(dem.aggregatedPrice)}</span>
                <span>GOP {fmtPct(gop.aggregatedPrice)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- source agreement matrix ----
function SourceAgreement() {
  const sources = ['PredictIt', 'Kalshi', 'Polymarket', 'Smarkets'];
  const leader = mockPresidential.contracts[0];

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-zinc-400" /> Source Consensus: {leader.name}
        </h3>
      </div>
      <div className="p-4 space-y-2">
        {leader.prices.map(p => {
          const diff = p.yesPrice - leader.aggregatedPrice;
          return (
            <div key={p.source} className="flex items-center gap-3">
              <span className="text-xs text-zinc-400 w-20 truncate">{p.source}</span>
              <div className="flex-1">
                <HorizontalBar value={p.yesPrice} color={getPartyColor(leader.name)} height="h-2" />
              </div>
              <span className="text-xs font-mono tabular-nums w-12 text-right">{fmtPct(p.yesPrice)}</span>
              <span className={`text-[10px] font-mono tabular-nums w-10 text-right ${
                Math.abs(diff) < 0.02 ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {diff > 0 ? '+' : ''}{(diff * 100).toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
          <Info className="w-3 h-3" />
          <span>Deviation from aggregated mean ({fmtPct(leader.aggregatedPrice)})</span>
        </div>
      </div>
    </div>
  );
}

// ---- Brier score / track record ----
function TrackRecordPanel() {
  const brierData = mockTrackRecord.map(r => ({
    label: `${r.state} '${r.year.toString().slice(2)}`,
    brier: r.brierScore,
    correct: r.actualOutcome === (r.predictedProbability > 0.5),
  }));

  const avgBrier = mockTrackRecord.reduce((sum, r) => sum + r.brierScore, 0) / mockTrackRecord.length;

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Target className="w-4 h-4 text-zinc-400" /> Track Record
        </h3>
        <span className="text-xs text-zinc-500">Brier Score: lower is better</span>
      </div>
      <div className="p-4">
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={brierData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="label" fontSize={9} tick={{ fill: '#71717a' }} stroke="#3f3f46" />
            <YAxis fontSize={10} tick={{ fill: '#71717a' }} stroke="#3f3f46" domain={[0, 0.6]} />
            <ReferenceLine y={0.25} stroke="#52525b" strokeDasharray="4 4" label={{ value: 'Good', fill: '#52525b', fontSize: 9 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '6px', fontSize: '12px' }}
              formatter={(value: number) => [value.toFixed(3), 'Brier Score']}
            />
            <Bar dataKey="brier" radius={[4, 4, 0, 0]}>
              {brierData.map((entry, i) => (
                <Cell key={i} fill={entry.correct ? '#22c55e' : '#ef4444'} fillOpacity={0.7} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-between text-xs mt-3 pt-2 border-t border-zinc-800">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Correct call
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" /> Wrong call
            </span>
          </div>
          <span className="font-mono text-zinc-400">Avg: {avgBrier.toFixed(3)}</span>
        </div>
      </div>
    </div>
  );
}

// ---- model confidence indicator ----
function ConfidenceMeter() {
  const confidence = 0.72; // Simulated
  const signals = [
    { label: 'Source agreement', status: 'high' as const },
    { label: 'Volume depth', status: 'high' as const },
    { label: 'Price stability', status: 'medium' as const },
    { label: 'Historical accuracy', status: 'medium' as const },
  ];

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Activity className="w-4 h-4 text-zinc-400" /> Confidence Signals
        </h3>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-center mb-4">
          <ProgressRing
            value={confidence}
            size={80}
            strokeWidth={6}
            color={confidence > 0.7 ? '#22c55e' : confidence > 0.5 ? '#f59e0b' : '#ef4444'}
            labelClass="text-base font-bold font-mono"
          />
        </div>
        <div className="text-center text-xs text-zinc-500 mb-4">Overall signal quality</div>
        <div className="space-y-2">
          {signals.map(s => (
            <div key={s.label} className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">{s.label}</span>
              {s.status === 'high' ? (
                <span className="flex items-center gap-1 text-emerald-400 text-xs"><CheckCircle className="w-3.5 h-3.5" /> High</span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400 text-xs"><AlertCircle className="w-3.5 h-3.5" /> Medium</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============== MAIN PAGE ==============
export default function ForecastDashboardPage() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      {/* Header */}
      <header className="border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">Forecast Dashboard</h1>
              <p className="text-xs text-zinc-500">Data-driven election analysis &middot; 4 sources aggregated</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(['7d', '30d', '90d'] as const).map(r => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  timeRange === r
                    ? 'bg-zinc-800 text-zinc-200'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Key metrics bar */}
      <div className="border-b border-zinc-800 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center gap-6 overflow-x-auto text-sm">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-zinc-500">Markets:</span>
            <span className="font-mono font-bold">{mockStats.totalMarkets}</span>
          </div>
          <div className="w-px h-4 bg-zinc-800" />
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-zinc-500">Volume:</span>
            <span className="font-mono font-bold">{fmtVol(mockStats.totalVolume)}</span>
          </div>
          <div className="w-px h-4 bg-zinc-800" />
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-zinc-500">Leader:</span>
            <span className="font-mono font-bold" style={{ color: getPartyColor(mockPresidential.contracts[0].name) }}>
              {mockPresidential.contracts[0].name} {fmtPct(mockPresidential.contracts[0].aggregatedPrice)}
            </span>
          </div>
          <div className="w-px h-4 bg-zinc-800" />
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-zinc-500">Updated:</span>
            <span className="font-mono text-zinc-400">{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        {/* Top row: Forecast + Control */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 mb-6">
          <ForecastPanel />
          <div className="space-y-6">
            <ControlForecasts />
            <ConfidenceMeter />
          </div>
        </div>

        {/* Middle row: Candidate tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <CandidateTable market={mockPresidential} title="Presidential: All Candidates" />
          <CandidateTable market={mockGOPPrimary} title="Republican Primary" />
        </div>

        {/* Bottom row: Source Agreement + Track Record */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SourceAgreement />
          <TrackRecordPanel />
        </div>

        {/* Footer */}
        <footer className="border-t border-zinc-800 mt-8 pt-6 pb-4 text-xs text-zinc-600 flex items-center justify-between">
          <span>ElectionOdds &middot; Forecast Dashboard &middot; Concept 04</span>
          <span className="flex items-center gap-1">
            <Info className="w-3 h-3" /> Market probabilities are not predictions. Past accuracy varies.
          </span>
        </footer>
      </div>
    </div>
  );
}
