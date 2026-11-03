import { ComposeError, parseSubject } from '@/lib/mail/compose';
import { createServices, replyWithFilm, replyWithUpload, StudioError, type UploadReplyRequest } from '@/lib/studio';
import { errorResponse, requireAccess } from '@/lib/session';

type Body = {
  source?: unknown;
  version?: unknown;
  label?: unknown;
  note?: unknown;
  episodes?: unknown;
  compose?: unknown;
} | null;

/** The upload a request names, or a 400 saying what is wrong with it. */
function uploadRequest(body: NonNullable<Body>, subject: string | null): UploadReplyRequest {
  const episodes = Array.isArray(body.episodes) ? body.episodes : [];
  const valid = episodes.every(
    (row: unknown) =>
      typeof row === 'object' &&
      row !== null &&
      typeof (row as { episode?: unknown }).episode === 'number' &&
      typeof (row as { filmId?: unknown }).filmId === 'string',
  );
  if (!valid) throw new StudioError(400, 'Danh sách video không hợp lệ.');
  return {
    version: String(body.version),
    label: typeof body.label === 'string' ? body.label : '',
    note: typeof body.note === 'string' ? body.note : '',
    episodes: episodes as UploadReplyRequest['episodes'],
    subject,
  };
}

/** The subject the studio wrote, or a 400 saying what is wrong with it. */
function subjectOf(body: NonNullable<Body>): string | null {
  try {
    return parseSubject(body.compose);
  } catch (error) {
    if (error instanceof ComposeError) throw new StudioError(400, error.message);
    throw error;
  }
}

/**
 * Hands a film back to the Creator named in the hand-off mail: a prepared `version` of demo-data, or
 * (`source: "upload"`) the videos the studio uploaded, one per ordered episode. The mail goes to the lead
 * Creator alone (BR-67); `compose.subject` is the only part of the envelope the studio writes.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  try {
    await requireAccess();
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as Body;
    if (typeof body?.version !== 'string' || !body.version) throw new StudioError(400, 'Chọn bản giao (version) cần gửi.');
    const subject = subjectOf(body);
    const services = createServices();
    const sent =
      body.source === 'upload'
        ? await replyWithUpload(services, id, uploadRequest(body, subject))
        : await replyWithFilm(services, id, body.version, subject);
    return Response.json(sent, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
