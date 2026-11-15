import { NextResponse, type NextRequest } from 'next/server';
import { getConfig } from '@/lib/config';
import { mutationToken } from '@/lib/session/server';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const fail = (status: number, message: string) =>
  NextResponse.json({ error: { code: status === 401 ? 'UNAUTHORIZED' : 'BAD_REQUEST', message } }, { status });

/** Only this site's own pages may post here (the session cookie is SameSite=Lax, this is a second check). */
function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === (request.headers.get('x-forwarded-host') ?? request.headers.get('host'));
  } catch {
    return false;
  }
}

/**
 * Hands the film of an episode to the AI Cinema API with the studio's token, which the browser never sees.
 * A multipart body (MP4/MOV file) is streamed through unread, so large films are not held in memory;
 * a JSON body is a link submission.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ episodeId: string }> }) {
  const { episodeId } = await context.params;
  if (!UUID.test(episodeId)) return fail(400, 'Mã tập không hợp lệ.');
  if (!sameOrigin(request)) return fail(400, 'Yêu cầu không đến từ Studio Web.');

  const token = await mutationToken();
  if (!token) return fail(401, 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');

  const contentType = request.headers.get('content-type') ?? '';
  const isUpload = contentType.startsWith('multipart/form-data');
  if (!isUpload && !contentType.startsWith('application/json')) return fail(400, 'Định dạng yêu cầu không hợp lệ.');

  const target = `${getConfig().apiUrl}/studio-portal/episodes/${episodeId}/media${isUpload ? '/upload' : ''}`;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': contentType, Accept: 'application/json' };

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: 'POST',
      headers,
      body: request.body,
      cache: 'no-store',
      // Node needs this to send a streamed request body.
      duplex: 'half',
    } as RequestInit & { duplex: 'half' });
  } catch {
    return NextResponse.json(
      { error: { code: 'NETWORK', message: 'Không kết nối được tới máy chủ AI Cinema' } },
      { status: 502 },
    );
  }
  const body = await upstream.text();
  return new NextResponse(body || null, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}
