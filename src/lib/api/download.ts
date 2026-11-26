import { NextResponse, type NextRequest } from 'next/server';
import { getConfig } from '@/lib/config';
import { EXPIRED_LOGIN_PATH } from '@/lib/session/paths';
import { mutationToken } from '@/lib/session/server';
import { SESSION_COOKIE_NAMES } from '@/lib/session/tokens';

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const fail = (status: number, message: string) => NextResponse.json({ error: { message } }, { status });

/** The link is opened by the browser itself, so an ended session goes to the login page rather than to a JSON error. */
function toLogin(request: NextRequest): NextResponse {
  const response = NextResponse.redirect(new URL(EXPIRED_LOGIN_PATH, request.url));
  for (const name of SESSION_COOKIE_NAMES) response.cookies.delete(name);
  return response;
}

/**
 * Downloads an API file with the session's token, which the browser never sees; the file is streamed through as the
 * API sends it.
 */
export async function proxyDownload(
  request: NextRequest,
  apiPath: string,
  { missing, fallbackType }: { missing: string; fallbackType: string },
): Promise<NextResponse> {
  const token = await mutationToken();
  if (!token) return toLogin(request);

  let upstream: Response;
  try {
    upstream = await fetch(`${getConfig().apiUrl}${apiPath}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
  } catch {
    return fail(502, 'Không kết nối được tới máy chủ AI Cinema');
  }
  if (upstream.status === 401) return toLogin(request);
  if (!upstream.ok || !upstream.body) {
    return fail(upstream.status === 404 ? 404 : 502, upstream.status === 404 ? missing : 'Không tải được tài liệu.');
  }
  const headers = new Headers({ 'Content-Type': upstream.headers.get('content-type') ?? fallbackType });
  for (const name of ['content-disposition', 'content-length']) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set('Cache-Control', 'private, no-store');
  return new NextResponse(upstream.body, { status: 200, headers });
}
