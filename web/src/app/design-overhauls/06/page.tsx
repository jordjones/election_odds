"use client";

import { useState, useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
  ReferenceLine,
} from "recharts";
import {
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Heart,
  Repeat2,
  Swords,
  BarChart3,
  Hash,
  ArrowRight,
  ChevronDown,
  Zap,
  Eye,
  Globe,
  Flame,
  Shield,
  Landmark,
  Leaf,
  Users,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { MOCK_POSTS } from "@/data/pulse-mock";
import type { MockPost, PulseTopic } from "@/lib/pulse-types";
import {
  mockPresidential,
  mockGOPPrimary,
  mockDEMPrimary,
} from "@/lib/api/mock-data";
import { getPartyColor, getPartyId } from "../_components/PartyColor";
import { ProgressRing } from "../_components/ProgressRing";
import { DualBar } from "../_components/HorizontalBar";

// ---- helpers ----
function fmtPct(v: number, d = 1) {
  return `${(v * 100).toFixed(d)}%`;
}
function fmtChange(v: number) {
  const p = (v * 100).toFixed(1);
  return v > 0 ? `+${p}` : `${p}`;
}
function fmtNum(v: number) {
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return `${v}`;
}

type ViewTab = "topics" | "odds" | "engagement" | "wordcloud" | "wordcloud2";

const TOPIC_CONFIG: Record<
  PulseTopic,
  { label: string; icon: LucideIcon; color: string }
> = {
  economy: { label: "Economy", icon: BarChart3, color: "#22c55e" },
  immigration: { label: "Immigration", icon: Shield, color: "#f97316" },
  "foreign-policy": { label: "Foreign Policy", icon: Globe, color: "#3b82f6" },
  healthcare: { label: "Healthcare", icon: Heart, color: "#ef4444" },
  climate: { label: "Climate", icon: Leaf, color: "#10b981" },
  "culture-war": { label: "Culture War", icon: Flame, color: "#f59e0b" },
  campaign: { label: "Campaign", icon: Users, color: "#8b5cf6" },
  general: { label: "General", icon: MessageSquare, color: "#71717a" },
};

// ---- get unique candidates from mock data ----
function getCandidates() {
  const seen = new Map<string, MockPost>();
  for (const p of MOCK_POSTS) {
    if (!seen.has(p.candidateName)) seen.set(p.candidateName, p);
  }
  return Array.from(seen.values()).map((p) => ({
    name: p.candidateName,
    handle: p.twitterHandle,
    posts: MOCK_POSTS.filter((x) => x.candidateName === p.candidateName),
  }));
}

// ---- generate mock odds movement data tied to tweets ----
function generateOddsReaction(post: MockPost) {
  const contract = [
    ...mockPresidential.contracts,
    ...mockGOPPrimary.contracts,
    ...mockDEMPrimary.contracts,
  ].find((c) => c.name === post.candidateName);
  const basePrice = contract?.aggregatedPrice ?? 0.15;

  // Simulate 24h of odds movement with tweet impact
  const points = [];
  const tweetHour = 12;
  for (let h = 0; h < 24; h++) {
    const drift = (Math.random() - 0.5) * 0.01;
    const impact =
      h >= tweetHour
        ? (h - tweetHour) * 0.003 * (post.likes > 50000 ? 1 : -0.5)
        : 0;
    const noise = Math.sin(h / 3) * 0.005;
    points.push({
      hour: h,
      label: `${h}:00`,
      price: Math.max(0.01, Math.min(0.99, basePrice + drift + impact + noise)),
      isTweet: h === tweetHour,
    });
  }
  return { points, basePrice, change: points[23].price - points[0].price };
}

// ---- mock tweet card ----
function TweetCard({
  post,
  className = "",
}: {
  post: MockPost;
  className?: string;
}) {
  const color = getPartyColor(post.candidateName);
  const party = getPartyId(post.candidateName);
  const topicCfg = TOPIC_CONFIG[post.topic];
  const TopicIcon = topicCfg.icon;

  return (
    <div
      className={`border border-zinc-800 rounded-xl bg-zinc-900 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 px-4 pt-3 pb-2">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={{ backgroundColor: color }}
        >
          {post.candidateName
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold truncate">
              {post.candidateName}
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-bold"
              style={{
                backgroundColor: `${color}20`,
                color,
              }}
            >
              {party === "gop" ? "R" : party === "dem" ? "D" : "I"}
            </span>
          </div>
          <span className="text-xs text-zinc-500">@{post.twitterHandle}</span>
        </div>
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
          style={{
            backgroundColor: `${topicCfg.color}20`,
            color: topicCfg.color,
          }}
        >
          <TopicIcon className="w-3 h-3" /> {topicCfg.label}
        </span>
      </div>

      {/* Text */}
      <div className="px-4 pb-3">
        <p className="text-sm leading-relaxed text-zinc-200">{post.text}</p>
      </div>

      {/* Engagement */}
      <div className="flex items-center gap-4 px-4 pb-3 text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <Heart className="w-3.5 h-3.5" /> {fmtNum(post.likes)}
        </span>
        <span className="flex items-center gap-1">
          <Repeat2 className="w-3.5 h-3.5" /> {fmtNum(post.retweets)}
        </span>
        {post.editorNote && (
          <span className="ml-auto text-[10px] text-zinc-600 italic truncate max-w-[200px]">
            {post.editorNote}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================
// VIEW 1: Topic Matchups
// ============================================================
function TopicMatchupsView({
  leftCandidate,
  rightCandidate,
}: {
  leftCandidate: ReturnType<typeof getCandidates>[0];
  rightCandidate: ReturnType<typeof getCandidates>[0];
}) {
  const leftColor = getPartyColor(leftCandidate.name);
  const rightColor = getPartyColor(rightCandidate.name);

  // Find topics where both candidates have posts
  const leftTopics = new Set(leftCandidate.posts.map((p) => p.topic));
  const rightTopics = new Set(rightCandidate.posts.map((p) => p.topic));
  const sharedTopics = [...leftTopics].filter((t) => rightTopics.has(t));
  const allTopics = [...new Set([...leftTopics, ...rightTopics])];

  return (
    <div className="space-y-6">
      {/* Shared topic matchups */}
      {sharedTopics.length > 0 && (
        <>
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
            <Swords className="w-3.5 h-3.5" /> Head-to-Head by Topic
          </h3>
          {sharedTopics.map((topic) => {
            const leftPost = leftCandidate.posts.find(
              (p) => p.topic === topic,
            )!;
            const rightPost = rightCandidate.posts.find(
              (p) => p.topic === topic,
            )!;
            const topicCfg = TOPIC_CONFIG[topic];
            const TopicIcon = topicCfg.icon;
            const leftEngagement = leftPost.likes + leftPost.retweets;
            const rightEngagement = rightPost.likes + rightPost.retweets;

            return (
              <div
                key={topic}
                className="border border-zinc-800 rounded-xl overflow-hidden"
              >
                {/* Topic header */}
                <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                  <span
                    className="flex items-center gap-2 text-sm font-bold"
                    style={{ color: topicCfg.color }}
                  >
                    <TopicIcon className="w-4 h-4" /> {topicCfg.label}
                  </span>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                    Engagement:{" "}
                    {leftEngagement > rightEngagement ? (
                      <span style={{ color: leftColor }}>
                        {leftCandidate.name.split(" ").pop()} wins
                      </span>
                    ) : (
                      <span style={{ color: rightColor }}>
                        {rightCandidate.name.split(" ").pop()} wins
                      </span>
                    )}
                  </span>
                </div>

                {/* Side-by-side tweets */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                  <div className="p-3 border-r border-zinc-800/50">
                    <TweetCard post={leftPost} />
                  </div>
                  <div className="p-3">
                    <TweetCard post={rightPost} />
                  </div>
                </div>

                {/* Engagement comparison bar */}
                <div className="px-4 py-2.5 border-t border-zinc-800 bg-zinc-950">
                  <DualBar
                    leftValue={
                      leftEngagement / (leftEngagement + rightEngagement)
                    }
                    rightValue={
                      rightEngagement / (leftEngagement + rightEngagement)
                    }
                    leftColor={leftColor}
                    rightColor={rightColor}
                    height="h-2"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                    <span>{fmtNum(leftEngagement)} total engagement</span>
                    <span>{fmtNum(rightEngagement)} total engagement</span>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Unique topic tweets */}
      {allTopics.filter((t) => !sharedTopics.includes(t)).length > 0 && (
        <>
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mt-6">
            Unique Topics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allTopics
              .filter((t) => !sharedTopics.includes(t))
              .map((topic) => {
                const post =
                  leftCandidate.posts.find((p) => p.topic === topic) ||
                  rightCandidate.posts.find((p) => p.topic === topic);
                if (!post) return null;
                return <TweetCard key={topic} post={post} />;
              })}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// VIEW 2: Odds Reactions
// ============================================================
function OddsReactionsView({
  leftCandidate,
  rightCandidate,
}: {
  leftCandidate: ReturnType<typeof getCandidates>[0];
  rightCandidate: ReturnType<typeof getCandidates>[0];
}) {
  const allPosts = [...leftCandidate.posts, ...rightCandidate.posts]
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
        <TrendingUp className="w-3.5 h-3.5" /> How Tweets Move the Odds
      </h3>

      {allPosts.map((post) => {
        const color = getPartyColor(post.candidateName);
        const reaction = generateOddsReaction(post);

        return (
          <div
            key={post.tweetId}
            className="border border-zinc-800 rounded-xl overflow-hidden"
          >
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px]">
              {/* Tweet */}
              <div className="p-3 border-r border-zinc-800">
                <TweetCard post={post} />
              </div>

              {/* Odds chart */}
              <div className="p-4 bg-zinc-900">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider">
                    24h Odds Movement
                  </span>
                  <span
                    className={`text-xs font-mono font-bold ${reaction.change > 0 ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {reaction.change > 0 ? "+" : ""}
                    {(reaction.change * 100).toFixed(2)}pp
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={reaction.points}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis
                      dataKey="label"
                      fontSize={9}
                      tick={{ fill: "#52525b" }}
                      stroke="#3f3f46"
                      interval={5}
                    />
                    <YAxis
                      fontSize={9}
                      tick={{ fill: "#52525b" }}
                      stroke="#3f3f46"
                      domain={["auto", "auto"]}
                      tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                    />
                    <ReferenceLine
                      x="12:00"
                      stroke={color}
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #3f3f46",
                        borderRadius: "6px",
                        fontSize: "11px",
                      }}
                      formatter={(value: number) => [fmtPct(value), "Odds"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke={color}
                      fill={color}
                      fillOpacity={0.1}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-2 mt-2 text-[10px] text-zinc-500">
                  <span
                    className="w-3 h-px"
                    style={{
                      backgroundColor: color,
                      display: "inline-block",
                      borderTop: `1px dashed ${color}`,
                    }}
                  />
                  Tweet posted at 12:00
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// VIEW 3: Engagement vs Odds
// ============================================================
function EngagementVsOddsView({
  leftCandidate,
  rightCandidate,
}: {
  leftCandidate: ReturnType<typeof getCandidates>[0];
  rightCandidate: ReturnType<typeof getCandidates>[0];
}) {
  const leftColor = getPartyColor(leftCandidate.name);
  const rightColor = getPartyColor(rightCandidate.name);

  // Build scatter data
  const allCandidates = getCandidates();
  const scatterData = allCandidates.flatMap((c) => {
    const contract = [
      ...mockPresidential.contracts,
      ...mockGOPPrimary.contracts,
      ...mockDEMPrimary.contracts,
    ].find((ct) => ct.name === c.name);
    if (!contract) return [];
    return c.posts.map((p) => ({
      name: c.name,
      handle: `@${c.handle}`,
      engagement: p.likes + p.retweets,
      odds: contract.aggregatedPrice,
      oddsChange: contract.priceChange,
      topic: p.topic,
      text: p.text.slice(0, 60) + "...",
      party: getPartyId(c.name),
      color: getPartyColor(c.name),
      isSelected:
        c.name === leftCandidate.name || c.name === rightCandidate.name,
    }));
  });

  // Summary stats
  const leftAvgEngagement =
    leftCandidate.posts.reduce((s, p) => s + p.likes + p.retweets, 0) /
    leftCandidate.posts.length;
  const rightAvgEngagement =
    rightCandidate.posts.reduce((s, p) => s + p.likes + p.retweets, 0) /
    rightCandidate.posts.length;
  const leftContract = [
    ...mockPresidential.contracts,
    ...mockGOPPrimary.contracts,
    ...mockDEMPrimary.contracts,
  ].find((c) => c.name === leftCandidate.name);
  const rightContract = [
    ...mockPresidential.contracts,
    ...mockGOPPrimary.contracts,
    ...mockDEMPrimary.contracts,
  ].find((c) => c.name === rightCandidate.name);

  return (
    <div className="space-y-6">
      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
        <BarChart3 className="w-3.5 h-3.5" /> Does Virality Predict Odds?
      </h3>

      {/* Scatter plot */}
      <div className="border border-zinc-800 rounded-xl bg-zinc-900 p-4">
        <div className="text-xs text-zinc-500 mb-3">
          Each dot is a tweet. X = total engagement (likes + retweets). Y =
          candidate&apos;s current odds.
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="engagement"
              name="Engagement"
              fontSize={10}
              tick={{ fill: "#71717a" }}
              stroke="#3f3f46"
              tickFormatter={(v: number) => fmtNum(v)}
              label={{
                value: "Total Engagement",
                position: "bottom",
                offset: -5,
                fill: "#52525b",
                fontSize: 10,
              }}
            />
            <YAxis
              dataKey="odds"
              name="Odds"
              fontSize={10}
              tick={{ fill: "#71717a" }}
              stroke="#3f3f46"
              tickFormatter={(v: number) => fmtPct(v, 0)}
              domain={[0, "auto"]}
              label={{
                value: "Current Odds",
                angle: -90,
                position: "insideLeft",
                fill: "#52525b",
                fontSize: 10,
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#18181b",
                border: "1px solid #3f3f46",
                borderRadius: "6px",
                fontSize: "11px",
              }}
              formatter={(value: number, name: string) => [
                name === "Engagement" ? fmtNum(value) : fmtPct(value),
                name,
              ]}
              labelFormatter={() => ""}
              content={({ payload }) => {
                if (!payload?.[0]) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-xs">
                    <div className="font-bold" style={{ color: d.color }}>
                      {d.name}
                    </div>
                    <div className="text-zinc-400">{d.text}</div>
                    <div className="mt-1 flex gap-3">
                      <span>Engagement: {fmtNum(d.engagement)}</span>
                      <span>Odds: {fmtPct(d.odds)}</span>
                    </div>
                  </div>
                );
              }}
            />
            <Scatter data={scatterData} isAnimationActive={false}>
              {scatterData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.color}
                  fillOpacity={entry.isSelected ? 0.9 : 0.3}
                  r={entry.isSelected ? 7 : 4}
                  stroke={entry.isSelected ? "#fff" : "none"}
                  strokeWidth={entry.isSelected ? 1.5 : 0}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-3 text-[10px] text-zinc-500">
          <span className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-full border-2 border-white"
              style={{ backgroundColor: leftColor }}
            />{" "}
            {leftCandidate.name}
          </span>
          <span className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-full border-2 border-white"
              style={{ backgroundColor: rightColor }}
            />{" "}
            {rightCandidate.name}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-zinc-500 opacity-40" />{" "}
            Others
          </span>
        </div>
      </div>

      {/* Comparison stats */}
      <div className="grid grid-cols-2 gap-4">
        {[
          {
            candidate: leftCandidate,
            color: leftColor,
            contract: leftContract,
            avgEng: leftAvgEngagement,
          },
          {
            candidate: rightCandidate,
            color: rightColor,
            contract: rightContract,
            avgEng: rightAvgEngagement,
          },
        ].map(({ candidate, color, contract, avgEng }) => (
          <div
            key={candidate.name}
            className="border border-zinc-800 rounded-xl bg-zinc-900 p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: color }}
              >
                {candidate.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div>
                <div className="text-sm font-bold">{candidate.name}</div>
                <div className="text-xs text-zinc-500">@{candidate.handle}</div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Avg Engagement</span>
                <span className="font-mono font-bold">{fmtNum(avgEng)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Current Odds</span>
                <span className="font-mono font-bold">
                  {contract ? fmtPct(contract.aggregatedPrice) : "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">24h Change</span>
                <span
                  className={`font-mono font-bold ${(contract?.priceChange ?? 0) > 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {contract ? fmtChange(contract.priceChange) : "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Posts</span>
                <span className="font-mono font-bold">
                  {candidate.posts.length}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// VIEW 4: Word Cloud
// ============================================================
function WordCloudView({
  leftCandidate,
  rightCandidate,
}: {
  leftCandidate: ReturnType<typeof getCandidates>[0];
  rightCandidate: ReturnType<typeof getCandidates>[0];
}) {
  const leftColor = getPartyColor(leftCandidate.name);
  const rightColor = getPartyColor(rightCandidate.name);

  const STOP_WORDS = new Set([
    "the",
    "a",
    "an",
    "is",
    "it",
    "of",
    "in",
    "to",
    "and",
    "for",
    "that",
    "this",
    "we",
    "our",
    "not",
    "are",
    "was",
    "but",
    "will",
    "what",
    "when",
    "its",
    "you",
    "your",
    "they",
    "their",
    "just",
    "with",
    "from",
    "have",
    "has",
    "about",
    "than",
    "been",
    "no",
    "more",
    "every",
    "how",
    "who",
    "can",
  ]);

  function getWords(posts: MockPost[]): { word: string; count: number }[] {
    const counts = new Map<string, number>();
    for (const p of posts) {
      const words = p.text
        .toLowerCase()
        .replace(/[^a-z\s'-]/g, "")
        .split(/\s+/);
      for (const w of words) {
        if (w.length < 3 || STOP_WORDS.has(w)) continue;
        counts.set(w, (counts.get(w) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 25);
  }

  const leftWords = getWords(leftCandidate.posts);
  const rightWords = getWords(rightCandidate.posts);
  const leftMax = Math.max(...leftWords.map((w) => w.count), 1);
  const rightMax = Math.max(...rightWords.map((w) => w.count), 1);

  // Find shared & unique words
  const leftSet = new Set(leftWords.map((w) => w.word));
  const rightSet = new Set(rightWords.map((w) => w.word));
  const shared = leftWords.filter((w) => rightSet.has(w.word));

  function WordBlock({
    words,
    max,
    color,
    label,
  }: {
    words: { word: string; count: number }[];
    max: number;
    color: string;
    label: string;
  }) {
    return (
      <div className="border border-zinc-800 rounded-xl bg-zinc-900 p-4">
        <div
          className="text-xs font-bold uppercase tracking-wider mb-3"
          style={{ color }}
        >
          <Hash className="w-3.5 h-3.5 inline mr-1" /> {label}
        </div>
        <div className="flex flex-wrap gap-2">
          {words.map((w) => {
            const scale = 0.6 + (w.count / max) * 0.6;
            const opacity = 0.4 + (w.count / max) * 0.6;
            return (
              <span
                key={w.word}
                className="inline-block px-2 py-1 rounded-lg font-medium transition-transform hover:scale-110"
                style={{
                  fontSize: `${Math.max(11, scale * 18)}px`,
                  backgroundColor: `${color}${Math.round(opacity * 30)
                    .toString(16)
                    .padStart(2, "0")}`,
                  color: color,
                  opacity: opacity,
                }}
              >
                {w.word}
                <span className="ml-1 text-[9px] opacity-60">{w.count}</span>
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
        <Hash className="w-3.5 h-3.5" /> Language Analysis
      </h3>

      {/* Side-by-side word clouds */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WordBlock
          words={leftWords}
          max={leftMax}
          color={leftColor}
          label={leftCandidate.name}
        />
        <WordBlock
          words={rightWords}
          max={rightMax}
          color={rightColor}
          label={rightCandidate.name}
        />
      </div>

      {/* Shared vocabulary */}
      {shared.length > 0 && (
        <div className="border border-zinc-800 rounded-xl bg-zinc-900 p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">
            <Swords className="w-3.5 h-3.5 inline mr-1" /> Shared Vocabulary
          </div>
          <div className="flex flex-wrap gap-2">
            {shared.map((w) => (
              <span
                key={w.word}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-800 text-sm"
              >
                <span className="font-medium text-zinc-200">{w.word}</span>
                <span
                  className="text-[10px] font-mono"
                  style={{ color: leftColor }}
                >
                  {leftWords.find((x) => x.word === w.word)?.count ?? 0}
                </span>
                <span className="text-zinc-600">vs</span>
                <span
                  className="text-[10px] font-mono"
                  style={{ color: rightColor }}
                >
                  {rightWords.find((x) => x.word === w.word)?.count ?? 0}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Topic distribution */}
      <div className="border border-zinc-800 rounded-xl bg-zinc-900 p-4">
        <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">
          Topic Focus
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { candidate: leftCandidate, color: leftColor },
            { candidate: rightCandidate, color: rightColor },
          ].map(({ candidate, color }) => {
            const topicCounts = new Map<PulseTopic, number>();
            for (const p of candidate.posts) {
              topicCounts.set(p.topic, (topicCounts.get(p.topic) ?? 0) + 1);
            }
            return (
              <div key={candidate.name}>
                <div className="text-sm font-bold mb-2" style={{ color }}>
                  {candidate.name}
                </div>
                <div className="space-y-1.5">
                  {[...topicCounts.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .map(([topic, count]) => {
                      const cfg = TOPIC_CONFIG[topic];
                      const TopicIcon = cfg.icon;
                      return (
                        <div
                          key={topic}
                          className="flex items-center gap-2 text-xs"
                        >
                          <TopicIcon
                            className="w-3 h-3"
                            style={{ color: cfg.color }}
                          />
                          <span className="text-zinc-400 flex-1">
                            {cfg.label}
                          </span>
                          <div className="w-16 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(count / candidate.posts.length) * 100}%`,
                                backgroundColor: cfg.color,
                              }}
                            />
                          </div>
                          <span className="font-mono text-zinc-500 w-4 text-right">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// VIEW 5: Merged Word Cloud (Venn-style)
// ============================================================
function MergedWordCloudView({
  leftCandidate,
  rightCandidate,
}: {
  leftCandidate: ReturnType<typeof getCandidates>[0];
  rightCandidate: ReturnType<typeof getCandidates>[0];
}) {
  const leftColor = getPartyColor(leftCandidate.name);
  const rightColor = getPartyColor(rightCandidate.name);
  const sharedColor = "#a855f7"; // purple for overlap

  const STOP_WORDS = new Set([
    "the",
    "a",
    "an",
    "is",
    "it",
    "of",
    "in",
    "to",
    "and",
    "for",
    "that",
    "this",
    "we",
    "our",
    "not",
    "are",
    "was",
    "but",
    "will",
    "what",
    "when",
    "its",
    "you",
    "your",
    "they",
    "their",
    "just",
    "with",
    "from",
    "have",
    "has",
    "about",
    "than",
    "been",
    "no",
    "more",
    "every",
    "how",
    "who",
    "can",
  ]);

  function getWordMap(posts: MockPost[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const p of posts) {
      const words = p.text
        .toLowerCase()
        .replace(/[^a-z\s'-]/g, "")
        .split(/\s+/);
      for (const w of words) {
        if (w.length < 3 || STOP_WORDS.has(w)) continue;
        counts.set(w, (counts.get(w) ?? 0) + 1);
      }
    }
    return counts;
  }

  const leftMap = getWordMap(leftCandidate.posts);
  const rightMap = getWordMap(rightCandidate.posts);

  // Classify words: left-only, right-only, shared
  const allWords = new Set([...leftMap.keys(), ...rightMap.keys()]);
  type CloudWord = {
    word: string;
    leftCount: number;
    rightCount: number;
    zone: "left" | "shared" | "right";
    totalCount: number;
  };

  const words: CloudWord[] = [];
  for (const w of allWords) {
    const lc = leftMap.get(w) ?? 0;
    const rc = rightMap.get(w) ?? 0;
    const zone = lc > 0 && rc > 0 ? "shared" : lc > 0 ? "left" : "right";
    words.push({
      word: w,
      leftCount: lc,
      rightCount: rc,
      zone,
      totalCount: lc + rc,
    });
  }

  // Sort: within each zone, sort by total count descending
  const leftOnly = words
    .filter((w) => w.zone === "left")
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, 20);
  const rightOnly = words
    .filter((w) => w.zone === "right")
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, 20);
  const shared = words
    .filter((w) => w.zone === "shared")
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, 15);

  const globalMax = Math.max(...words.map((w) => w.totalCount), 1);

  function wordStyle(w: CloudWord, color: string) {
    const scale = 0.5 + (w.totalCount / globalMax) * 0.8;
    const opacity = 0.45 + (w.totalCount / globalMax) * 0.55;
    return {
      fontSize: `${Math.max(11, scale * 20)}px`,
      backgroundColor: `${color}${Math.round(opacity * 25)
        .toString(16)
        .padStart(2, "0")}`,
      color,
      opacity,
    };
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
        <Hash className="w-3.5 h-3.5" /> Merged Language Map
      </h3>
      <p className="text-xs text-zinc-500 -mt-4">
        Unique words on each side, shared vocabulary in the center. Size =
        frequency.
      </p>

      {/* Merged cloud */}
      <div className="border border-zinc-800 rounded-xl bg-zinc-900 overflow-hidden">
        {/* Legend */}
        <div className="flex items-center justify-center gap-6 px-4 py-3 border-b border-zinc-800 bg-zinc-950">
          <span className="flex items-center gap-1.5 text-xs">
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: leftColor }}
            />
            <span style={{ color: leftColor }} className="font-bold">
              {leftCandidate.name.split(" ").pop()}
            </span>{" "}
            only
          </span>
          <span className="flex items-center gap-1.5 text-xs">
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: sharedColor }}
            />
            <span style={{ color: sharedColor }} className="font-bold">
              Shared
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-xs">
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: rightColor }}
            />
            <span style={{ color: rightColor }} className="font-bold">
              {rightCandidate.name.split(" ").pop()}
            </span>{" "}
            only
          </span>
        </div>

        {/* Three-zone layout */}
        <div className="grid grid-cols-[1fr_auto_1fr] min-h-[280px]">
          {/* Left zone */}
          <div
            className="p-4 flex flex-wrap content-center gap-1.5 justify-end"
            style={{ borderRight: "1px dashed #3f3f46" }}
          >
            {leftOnly.length === 0 && (
              <span className="text-xs text-zinc-600 italic">
                No unique words
              </span>
            )}
            {leftOnly.map((w) => (
              <span
                key={w.word}
                className="inline-block px-2 py-1 rounded-lg font-medium transition-transform hover:scale-110 cursor-default"
                style={wordStyle(w, leftColor)}
                title={`${w.word}: ${w.leftCount}x (${leftCandidate.name} only)`}
              >
                {w.word}
              </span>
            ))}
          </div>

          {/* Center zone - shared */}
          <div className="p-4 flex flex-wrap content-center gap-1.5 justify-center min-w-[160px] max-w-[240px] bg-zinc-950/30">
            {shared.length === 0 && (
              <span className="text-xs text-zinc-600 italic">
                No shared words
              </span>
            )}
            {shared.map((w) => {
              const leftDominant = w.leftCount > w.rightCount;
              return (
                <span
                  key={w.word}
                  className="inline-block px-2 py-1 rounded-lg font-medium transition-transform hover:scale-110 cursor-default relative group"
                  style={wordStyle(w, sharedColor)}
                  title={`${w.word}: ${w.leftCount}x ${leftCandidate.name.split(" ").pop()}, ${w.rightCount}x ${rightCandidate.name.split(" ").pop()}`}
                >
                  {w.word}
                  {/* Tiny ownership indicator */}
                  <span className="ml-1 inline-flex gap-px align-middle">
                    <span
                      className="inline-block w-1 rounded-sm"
                      style={{
                        height: `${Math.max(4, (w.leftCount / (w.leftCount + w.rightCount)) * 12)}px`,
                        backgroundColor: leftColor,
                        opacity: 0.8,
                      }}
                    />
                    <span
                      className="inline-block w-1 rounded-sm"
                      style={{
                        height: `${Math.max(4, (w.rightCount / (w.leftCount + w.rightCount)) * 12)}px`,
                        backgroundColor: rightColor,
                        opacity: 0.8,
                      }}
                    />
                  </span>
                </span>
              );
            })}
          </div>

          {/* Right zone */}
          <div
            className="p-4 flex flex-wrap content-center gap-1.5 justify-start"
            style={{ borderLeft: "1px dashed #3f3f46" }}
          >
            {rightOnly.length === 0 && (
              <span className="text-xs text-zinc-600 italic">
                No unique words
              </span>
            )}
            {rightOnly.map((w) => (
              <span
                key={w.word}
                className="inline-block px-2 py-1 rounded-lg font-medium transition-transform hover:scale-110 cursor-default"
                style={wordStyle(w, rightColor)}
                title={`${w.word}: ${w.rightCount}x (${rightCandidate.name} only)`}
              >
                {w.word}
              </span>
            ))}
          </div>
        </div>

        {/* Stats footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-800 bg-zinc-950 text-[10px] text-zinc-500">
          <span style={{ color: leftColor }}>
            {leftOnly.length} unique words
          </span>
          <span style={{ color: sharedColor }}>{shared.length} shared</span>
          <span style={{ color: rightColor }}>
            {rightOnly.length} unique words
          </span>
        </div>
      </div>

      {/* Overlap analysis */}
      <div className="border border-zinc-800 rounded-xl bg-zinc-900 p-4">
        <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">
          Vocabulary Overlap
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div
              className="h-6 rounded-full overflow-hidden flex"
              style={{ backgroundColor: "#27272a" }}
            >
              <div
                className="h-full transition-[width] duration-500"
                style={{
                  width: `${(leftOnly.length / (leftOnly.length + shared.length + rightOnly.length)) * 100}%`,
                  backgroundColor: leftColor,
                }}
              />
              <div
                className="h-full transition-[width] duration-500"
                style={{
                  width: `${(shared.length / (leftOnly.length + shared.length + rightOnly.length)) * 100}%`,
                  backgroundColor: sharedColor,
                }}
              />
              <div
                className="h-full transition-[width] duration-500"
                style={{
                  width: `${(rightOnly.length / (leftOnly.length + shared.length + rightOnly.length)) * 100}%`,
                  backgroundColor: rightColor,
                }}
              />
            </div>
          </div>
          <span className="text-xs font-mono text-zinc-400 shrink-0">
            {(
              (shared.length /
                Math.max(
                  leftOnly.length + shared.length + rightOnly.length,
                  1,
                )) *
              100
            ).toFixed(0)}
            % overlap
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function TweetBattlePage() {
  const candidates = useMemo(getCandidates, []);
  const [leftIdx, setLeftIdx] = useState(0);
  const [rightIdx, setRightIdx] = useState(1);
  const [activeView, setActiveView] = useState<ViewTab>("topics");

  const left = candidates[leftIdx];
  const right = candidates[rightIdx];
  const leftColor = getPartyColor(left.name);
  const rightColor = getPartyColor(right.name);

  const views: { id: ViewTab; label: string; icon: LucideIcon }[] = [
    { id: "topics", label: "Topic Matchup", icon: Swords },
    { id: "odds", label: "Odds Reaction", icon: TrendingUp },
    { id: "engagement", label: "Engagement vs Odds", icon: BarChart3 },
    { id: "wordcloud", label: "Word Cloud", icon: Hash },
    { id: "wordcloud2", label: "Word Cloud 2", icon: Layers },
  ];

  // Candidate selector
  function CandidateSelector({
    value,
    onChange,
    exclude,
    side,
  }: {
    value: number;
    onChange: (v: number) => void;
    exclude: number;
    side: "left" | "right";
  }) {
    const color = side === "left" ? leftColor : rightColor;
    const candidate = candidates[value];
    const contract = [
      ...mockPresidential.contracts,
      ...mockGOPPrimary.contracts,
      ...mockDEMPrimary.contracts,
    ].find((c) => c.name === candidate.name);

    return (
      <div className="flex-1">
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-bold appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-zinc-600"
          style={{ color }}
        >
          {candidates.map((c, i) => (
            <option key={c.name} value={i} disabled={i === exclude}>
              {c.name} (@{c.handle})
            </option>
          ))}
        </select>
        {contract && (
          <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
            <span>
              Odds:{" "}
              <span className="font-mono font-bold text-zinc-300">
                {fmtPct(contract.aggregatedPrice)}
              </span>
            </span>
            <span
              className={`font-mono ${contract.priceChange > 0 ? "text-emerald-400" : "text-red-400"}`}
            >
              {fmtChange(contract.priceChange)}
            </span>
            <span>{candidate.posts.length} posts</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-red-500 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">
                Tweet Battle
              </h1>
              <p className="text-xs text-zinc-500">
                Candidate rhetoric head-to-head &middot; Mock data
              </p>
            </div>
          </div>
          <span className="text-xs text-zinc-500">
            ElectionOdds &middot; Concept 06
          </span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
        {/* Candidate selectors */}
        <div className="flex items-center gap-4 mb-6">
          <CandidateSelector
            value={leftIdx}
            onChange={setLeftIdx}
            exclude={rightIdx}
            side="left"
          />
          <div className="flex flex-col items-center gap-1 px-2">
            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <Swords className="w-5 h-5 text-zinc-400" />
            </div>
            <span className="text-[10px] font-bold text-zinc-600 uppercase">
              VS
            </span>
          </div>
          <CandidateSelector
            value={rightIdx}
            onChange={setRightIdx}
            exclude={leftIdx}
            side="right"
          />
        </div>

        {/* Quick comparison bar */}
        <div className="border border-zinc-800 rounded-xl bg-zinc-900 p-4 mb-6">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="text-center">
              <ProgressRing
                value={
                  [
                    ...mockPresidential.contracts,
                    ...mockGOPPrimary.contracts,
                    ...mockDEMPrimary.contracts,
                  ].find((c) => c.name === left.name)?.aggregatedPrice ?? 0.15
                }
                size={64}
                strokeWidth={4}
                color={leftColor}
                labelClass="text-xs font-bold font-mono"
                className="mx-auto mb-1"
              />
              <div className="text-sm font-bold">{left.name}</div>
              <div className="text-xs text-zinc-500">
                {left.posts.length} tweets &middot;{" "}
                {fmtNum(left.posts.reduce((s, p) => s + p.likes, 0))} likes
              </div>
            </div>
            <DualBar
              leftValue={(() => {
                const l = left.posts.reduce(
                  (s, p) => s + p.likes + p.retweets,
                  0,
                );
                const r = right.posts.reduce(
                  (s, p) => s + p.likes + p.retweets,
                  0,
                );
                return l / (l + r || 1);
              })()}
              rightValue={(() => {
                const l = left.posts.reduce(
                  (s, p) => s + p.likes + p.retweets,
                  0,
                );
                const r = right.posts.reduce(
                  (s, p) => s + p.likes + p.retweets,
                  0,
                );
                return r / (l + r || 1);
              })()}
              leftColor={leftColor}
              rightColor={rightColor}
              height="h-3"
              className="w-48"
            />
            <div className="text-center">
              <ProgressRing
                value={
                  [
                    ...mockPresidential.contracts,
                    ...mockGOPPrimary.contracts,
                    ...mockDEMPrimary.contracts,
                  ].find((c) => c.name === right.name)?.aggregatedPrice ?? 0.15
                }
                size={64}
                strokeWidth={4}
                color={rightColor}
                labelClass="text-xs font-bold font-mono"
                className="mx-auto mb-1"
              />
              <div className="text-sm font-bold">{right.name}</div>
              <div className="text-xs text-zinc-500">
                {right.posts.length} tweets &middot;{" "}
                {fmtNum(right.posts.reduce((s, p) => s + p.likes, 0))} likes
              </div>
            </div>
          </div>
        </div>

        {/* View tabs */}
        <div className="flex gap-1 mb-6 border-b border-zinc-800 overflow-x-auto">
          {views.map((v) => {
            const Icon = v.icon;
            return (
              <button
                key={v.id}
                onClick={() => setActiveView(v.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 shrink-0 ${
                  activeView === v.id
                    ? "border-purple-500 text-purple-400"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {v.label}
              </button>
            );
          })}
        </div>

        {/* Active view */}
        {activeView === "topics" && (
          <TopicMatchupsView leftCandidate={left} rightCandidate={right} />
        )}
        {activeView === "odds" && (
          <OddsReactionsView leftCandidate={left} rightCandidate={right} />
        )}
        {activeView === "engagement" && (
          <EngagementVsOddsView leftCandidate={left} rightCandidate={right} />
        )}
        {activeView === "wordcloud" && (
          <WordCloudView leftCandidate={left} rightCandidate={right} />
        )}
        {activeView === "wordcloud2" && (
          <MergedWordCloudView leftCandidate={left} rightCandidate={right} />
        )}

        {/* Footer */}
        <footer className="border-t border-zinc-800 mt-8 pt-6 pb-4 text-xs text-zinc-600 flex items-center justify-between">
          <span>ElectionOdds &middot; Tweet Battle &middot; Concept 06</span>
          <span>All tweets are mock data for design purposes</span>
        </footer>
      </div>
    </div>
  );
}
