'use client';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PULSE_TOPICS, PULSE_RACES } from '@/lib/pulse-types';
import type { PulseTopic, PulseRace, PulseSortMode, PulseCandidate } from '@/lib/pulse-types';

interface PulseFilterBarProps {
  candidates?: PulseCandidate[];
  selectedRace?: PulseRace;
  selectedCandidate?: string;
  selectedTopic?: PulseTopic;
  selectedSort: PulseSortMode;
  onRaceChange: (value: PulseRace | undefined) => void;
  onCandidateChange: (value: string | undefined) => void;
  onTopicChange: (value: PulseTopic | undefined) => void;
  onSortChange: (value: PulseSortMode) => void;
}

export function PulseFilterBar({
  candidates,
  selectedRace,
  selectedCandidate,
  selectedTopic,
  selectedSort,
  onRaceChange,
  onCandidateChange,
  onTopicChange,
  onSortChange,
}: PulseFilterBarProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {/* Race filter */}
      <Select
        value={selectedRace || 'all'}
        onValueChange={(v) => onRaceChange(v === 'all' ? undefined : v as PulseRace)}
      >
        <SelectTrigger size="sm">
          <SelectValue placeholder="All Races" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Races</SelectItem>
          {/* Top-level races (no group) */}
          {PULSE_RACES.filter((r) => !r.group).map((r) => (
            <SelectItem key={r.value} value={r.value}>
              {r.label}
            </SelectItem>
          ))}
          {/* Sub-races grouped under their parent */}
          {(() => {
            const midtermSubs = PULSE_RACES.filter((r) => r.group === 'midterm-2026');
            if (midtermSubs.length === 0) return null;
            return (
              <SelectGroup className="pl-4">
                <SelectLabel className="pl-2">By State Primary</SelectLabel>
                {midtermSubs.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            );
          })()}
        </SelectContent>
      </Select>

      {/* Candidate filter */}
      <Select
        value={selectedCandidate || 'all'}
        onValueChange={(v) => onCandidateChange(v === 'all' ? undefined : v)}
      >
        <SelectTrigger size="sm">
          <SelectValue placeholder="All Candidates" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Candidates</SelectItem>
          {candidates?.map((c) => (
            <SelectItem key={c.slug} value={c.slug}>
              {c.name} ({c.postCount})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Topic filter */}
      <Select
        value={selectedTopic || 'all'}
        onValueChange={(v) => onTopicChange(v === 'all' ? undefined : v as PulseTopic)}
      >
        <SelectTrigger size="sm">
          <SelectValue placeholder="All Topics" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Topics</SelectItem>
          {PULSE_TOPICS.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Sort */}
      <Select
        value={selectedSort}
        onValueChange={(v) => onSortChange(v as PulseSortMode)}
      >
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="recent">Most Recent</SelectItem>
          <SelectItem value="popular">Most Popular</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
