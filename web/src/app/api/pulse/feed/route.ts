import { NextResponse } from 'next/server';
import type { PulseTopic, PulseRace, PulseSortMode, CuratedPostRow } from '@/lib/pulse-types';
import { matchesRaceFilter } from '@/lib/pulse-types';
import { MOCK_POSTS } from '@/data/pulse-mock';
import { getTwitterHandle, candidateNameToSlug, getCandidateRaces } from '@/lib/candidates';
import { usePostgres } from '@/lib/use-postgres';
import { getCuratedPostsAsync } from '@/lib/db-pg';
import { getCuratedPosts } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const race = searchParams.get('race') as PulseRace | null;
  const candidate = searchParams.get('candidate');
  const topic = searchParams.get('topic') as PulseTopic | null;
  const sort = (searchParams.get('sort') || 'recent') as PulseSortMode;

  try {
    // Fetch curated posts from DB (Supabase) or CSV (local dev)
    const curatedRows: CuratedPostRow[] = usePostgres()
      ? await getCuratedPostsAsync()
      : getCuratedPosts();

    // Merge curated + mock posts into a unified feed
    const allPosts = [
      ...curatedRows.map((p) => ({
        tweetId: p.tweet_id,
        candidateName: p.candidate_name,
        twitterHandle: getTwitterHandle(p.candidate_name) || '',
        topic: p.topic,
        postedAt: p.posted_at,
        editorNote: p.editor_note,
        isMock: false,
        text: p.tweet_text ?? undefined,
        likes: p.likes ?? undefined,
        retweets: p.retweets ?? undefined,
        replies: p.replies ?? undefined,
        views: p.views ?? undefined,
        enrichedAt: p.enriched_at ?? undefined,
      })),
      ...MOCK_POSTS.map((p) => ({
        tweetId: p.tweetId,
        candidateName: p.candidateName,
        twitterHandle: p.twitterHandle,
        topic: p.topic,
        postedAt: p.postedAt,
        editorNote: p.editorNote,
        isMock: true,
        text: p.text,
        likes: p.likes,
        retweets: p.retweets,
        replies: undefined as number | undefined,
        views: undefined as number | undefined,
        enrichedAt: undefined as string | undefined,
      })),
    ];

    let filtered = allPosts;

    // Filter by race
    if (race) {
      filtered = filtered.filter(
        (p) => matchesRaceFilter(getCandidateRaces(p.candidateName), race)
      );
    }

    // Filter by candidate slug
    if (candidate) {
      filtered = filtered.filter(
        (p) => candidateNameToSlug(p.candidateName) === candidate
      );
    }

    // Filter by topic
    if (topic) {
      filtered = filtered.filter((p) => p.topic === topic);
    }

    // Sort
    if (sort === 'recent') {
      filtered.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
    } else if (sort === 'popular') {
      filtered.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    }

    return NextResponse.json(filtered, {
      headers: {
        'Cache-Control': 'public, max-age=300',
        'CDN-Cache-Control': 'public, max-age=600, stale-while-revalidate=1200',
        'Netlify-Vary': 'query',
      },
    });
  } catch (error) {
    console.error('[API /pulse/feed] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch pulse feed' }, { status: 500 });
  }
}
