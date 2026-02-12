import { NextResponse } from 'next/server';
import type { PulseCandidate, PulseRace, CuratedPostRow } from '@/lib/pulse-types';
import { matchesRaceFilter } from '@/lib/pulse-types';
import { MOCK_POSTS } from '@/data/pulse-mock';
import { getTwitterHandle, candidateNameToSlug, getCandidateRaces } from '@/lib/candidates';
import { usePostgres } from '@/lib/use-postgres';
import { getCuratedPostsAsync } from '@/lib/db-pg';
import { getCuratedPosts } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const race = searchParams.get('race') as PulseRace | null;
  try {
    // Fetch curated posts from DB or CSV
    const curatedRows: CuratedPostRow[] = usePostgres()
      ? await getCuratedPostsAsync()
      : getCuratedPosts();

    // Combine curated + mock posts, normalized to common shape
    const allPosts = [
      ...curatedRows.map((p) => ({
        candidateName: p.candidate_name,
        postedAt: p.posted_at,
      })),
      ...MOCK_POSTS.map((p) => ({
        candidateName: p.candidateName,
        postedAt: p.postedAt,
      })),
    ];

    const filteredPosts = race
      ? allPosts.filter((p) => matchesRaceFilter(getCandidateRaces(p.candidateName), race))
      : allPosts;

    const postsByCandidateMap = new Map<string, { count: number; latestAt: string }>();

    for (const post of filteredPosts) {
      const existing = postsByCandidateMap.get(post.candidateName);
      if (existing) {
        existing.count++;
        if (new Date(post.postedAt) > new Date(existing.latestAt)) {
          existing.latestAt = post.postedAt;
        }
      } else {
        postsByCandidateMap.set(post.candidateName, {
          count: 1,
          latestAt: post.postedAt,
        });
      }
    }

    const candidates: PulseCandidate[] = [];
    for (const [name, data] of postsByCandidateMap) {
      const handle = getTwitterHandle(name);
      if (!handle) continue;
      candidates.push({
        name,
        slug: candidateNameToSlug(name),
        twitterHandle: handle,
        postCount: data.count,
        latestPostAt: data.latestAt,
      });
    }

    // Sort by post count descending
    candidates.sort((a, b) => b.postCount - a.postCount);

    return NextResponse.json(candidates, {
      headers: {
        'Cache-Control': 'public, max-age=300',
        'CDN-Cache-Control': 'public, max-age=600',
      },
    });
  } catch (error) {
    console.error('[API /pulse/candidates] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch pulse candidates' }, { status: 500 });
  }
}
