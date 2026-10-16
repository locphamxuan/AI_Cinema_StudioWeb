import { getConfig } from '@/lib/config';
import { filmStream, readFilm } from '@/lib/films';

/**
 * The link in the film mail. The Creator has no access code, so the unguessable id is what guards the file;
 * the name must match too, so a mistyped link fails instead of handing out another video.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; name: string }> }): Promise<Response> {
  const { id, name } = await params;
  const { dataDir } = getConfig();
  const film = await readFilm(dataDir, id);
  if (!film || decodeURIComponent(name) !== film.fileName) {
    return new Response('Không tìm thấy phim, hoặc Studio đã xoá tệp này.', { status: 404 });
  }
  return new Response(filmStream(dataDir, film), {
    headers: {
      'Content-Type': film.contentType,
      'Content-Length': String(film.sizeBytes),
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(film.fileName)}`,
      'Cache-Control': 'private, no-store',
    },
  });
}
