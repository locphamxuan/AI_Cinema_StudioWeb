import { createServices, StudioError } from '@/lib/studio';
import { errorResponse, requireAccess } from '@/lib/session';

/** Downloads an attachment of a hand-off mail (the brief PDF, the idea files, the material). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
): Promise<Response> {
  try {
    await requireAccess();
    const { id, attachmentId } = await params;
    const file = await createServices().inbox.attachment(id, attachmentId);
    if (!file) throw new StudioError(404, 'Không tìm thấy tệp đính kèm.');
    return new Response(new Uint8Array(file.content), {
      headers: {
        'Content-Type': file.contentType,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
