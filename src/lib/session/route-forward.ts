import { NextResponse, type NextRequest } from 'next/server';
import { getConfig } from '@/lib/config';
import { mutationToken } from './server';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const fail = (status: number, message: string) =>
  NextResponse.json({ error: { code: status === 401 ? 'UNAUTHORIZED' : 'BAD_REQUEST', message } }, { status });

/** Only this site's own pages may post here (the session cookie is SameSite=Lax, this is a second check). */
export function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === (request.headers.get('x-forwarded-host') ?? request.headers.get('host'));
  } catch {
    return false;
  }
}

/**
 * Forwards a small JSON request of an episode's film delivery to the AI Cinema API with the studio's token, which
 * the browser never sees, and answers what the API answered.
 */
export async function forwardEpisodeJson(request: NextRequest, episodeId: string, path: string): Promise<NextResponse> {
  if (!UUID.test(episodeId)) return fail(400, 'Mã tập không hợp lệ.');
  if (!sameOrigin(request)) return fail(400, 'Yêu cầu không đến từ Studio Web.');
  const token = await mutationToken();
  if (!token) return fail(401, 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');

  let upstream: Response;
  try {
    upstream = await fetch(`${getConfig().apiUrl}/studio-portal/episodes/${episodeId}/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: await request.text(),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ error: { code: 'NETWORK', message: 'Không kết nối được tới máy chủ AI Cinema' } }, { status: 502 });
  }
  const body = await upstream.text();
  return new NextResponse(body || null, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}
