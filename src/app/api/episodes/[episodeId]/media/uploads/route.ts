import type { NextRequest } from 'next/server';
import { forwardEpisodeJson } from '@/lib/session/route-forward';

/** Starts a direct upload: the API checks the film announced and signs the URL the browser PUTs it to. */
export async function POST(request: NextRequest, context: { params: Promise<{ episodeId: string }> }) {
  return forwardEpisodeJson(request, (await context.params).episodeId, 'media/uploads');
}
