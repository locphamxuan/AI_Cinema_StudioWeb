import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { getConfig } from '@/lib/config';
import { FilmRejected, saveFilm } from '@/lib/films';
import { errorResponse, requireAccess } from '@/lib/session';

/**
 * Uploads one video from the studio's machine. The body is the file itself (not a form) so it streams to disk;
 * its name comes in `x-file-name`, URI-encoded so any Vietnamese name survives the header.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    await requireAccess();
    const name = decodeURIComponent(request.headers.get('x-file-name') ?? '');
    if (!name) return Response.json({ error: 'Thiếu tên tệp (x-file-name).' }, { status: 400 });
    const film = await saveFilm(getConfig().dataDir, name, request.body as WebReadableStream<Uint8Array> | null);
    return Response.json(film, { status: 201 });
  } catch (error) {
    if (error instanceof FilmRejected) return Response.json({ error: error.message }, { status: error.status });
    return errorResponse(error);
  }
}
