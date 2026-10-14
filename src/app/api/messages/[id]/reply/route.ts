import { createServices, replyWithFilm, StudioError } from '@/lib/studio';
import { errorResponse, requireAccess } from '@/lib/session';

/** Hands the prepared film `version` back to the Creator named in the hand-off mail. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    await requireAccess();
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as { version?: unknown } | null;
    if (typeof body?.version !== 'string' || !body.version) throw new StudioError(400, 'Chọn bản giao (version) cần gửi.');
    return Response.json(await replyWithFilm(createServices(), id, body.version), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
