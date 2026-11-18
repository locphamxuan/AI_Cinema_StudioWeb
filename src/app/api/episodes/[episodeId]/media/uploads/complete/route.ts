import type { NextRequest } from 'next/server';
import { forwardEpisodeJson } from '@/lib/session/route-forward';

/** Finishes a direct upload: the API checks the stored film and sends it to the Reviewer. */
export async function POST(request: NextRequest, context: { params: Promise<{ episodeId: string }> }) {
  return forwardEpisodeJson(request, (await context.params).episodeId, 'media/uploads/complete');
}
