import { NextResponse } from 'next/server';
import { PULSE_TOPICS } from '@/lib/pulse-types';
import type { PulseTopic, CuratedPostRow } from '@/lib/pulse-types';
import { MOCK_POSTS } from '@/data/pulse-mock';
import { usePostgres } from '@/lib/use-postgres';
import { getCuratedPostsAsync } from '@/lib/db-pg';
import { getCuratedPosts } from '@/lib/db';

export async function GET() {
  try {
    // Fetch curated posts from DB or CSV
    const curatedRows: CuratedPostRow[] = usePostgres()
      ? await getCuratedPostsAsync()
      : getCuratedPosts();

    // Count posts per topic
    const topicCounts = new Map<PulseTopic, number>();
    for (const post of curatedRows) {
      topicCounts.set(post.topic, (topicCounts.get(post.topic) || 0) + 1);
    }
    for (const post of MOCK_POSTS) {
      topicCounts.set(post.topic, (topicCounts.get(post.topic) || 0) + 1);
    }

    const topics = PULSE_TOPICS.map((t) => ({
      ...t,
      postCount: topicCounts.get(t.value) || 0,
    })).filter((t) => t.postCount > 0);

    // Sort by count descending
    topics.sort((a, b) => b.postCount - a.postCount);

    return NextResponse.json(topics, {
      headers: {
        'Cache-Control': 'public, max-age=300',
        'CDN-Cache-Control': 'public, max-age=600',
      },
    });
  } catch (error) {
    console.error('[API /pulse/topics] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch pulse topics' }, { status: 500 });
  }
}
