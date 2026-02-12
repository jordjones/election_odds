'use client';

import { useQuery } from '@tanstack/react-query';
import type { PulseFeedFilters, PulseCandidate, PulseTopic, PulseRace } from '@/lib/pulse-types';

const API_BASE = '/api/pulse';

interface PulseFeedItem {
  tweetId: string;
  candidateName: string;
  twitterHandle: string;
  topic: PulseTopic;
  postedAt: string;
  editorNote?: string;
  isMock: boolean;
  text?: string;
  likes?: number;
  retweets?: number;
}

interface PulseTopicWithCount {
  value: PulseTopic;
  label: string;
  postCount: number;
}

export function usePulseFeed(filters?: PulseFeedFilters) {
  const params = new URLSearchParams();
  if (filters?.race) params.set('race', filters.race);
  if (filters?.candidate) params.set('candidate', filters.candidate);
  if (filters?.topic) params.set('topic', filters.topic);
  if (filters?.sort) params.set('sort', filters.sort);
  const query = params.toString();

  return useQuery<PulseFeedItem[]>({
    queryKey: ['pulse-feed', filters],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/feed${query ? `?${query}` : ''}`);
      if (!res.ok) throw new Error('Failed to fetch pulse feed');
      return res.json();
    },
  });
}

export function usePulseCandidates(race?: PulseRace) {
  const params = new URLSearchParams();
  if (race) params.set('race', race);
  const query = params.toString();

  return useQuery<PulseCandidate[]>({
    queryKey: ['pulse-candidates', race],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/candidates${query ? `?${query}` : ''}`);
      if (!res.ok) throw new Error('Failed to fetch pulse candidates');
      return res.json();
    },
  });
}

export function usePulseTopics() {
  return useQuery<PulseTopicWithCount[]>({
    queryKey: ['pulse-topics'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/topics`);
      if (!res.ok) throw new Error('Failed to fetch pulse topics');
      return res.json();
    },
  });
}
