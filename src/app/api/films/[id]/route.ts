import { getConfig } from '@/lib/config';
import { removeFilm } from '@/lib/films';
import { errorResponse, requireAccess } from '@/lib/session';

/** Drops a video the studio uploaded by mistake; a link already mailed stops working. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    await requireAccess();
    const { id } = await params;
    if (!(await removeFilm(getConfig().dataDir, id))) return Response.json({ error: 'Không tìm thấy video.' }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
