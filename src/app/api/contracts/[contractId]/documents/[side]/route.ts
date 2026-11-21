import { NextResponse, type NextRequest } from 'next/server';
import { getConfig } from '@/lib/config';
import { EXPIRED_LOGIN_PATH } from '@/lib/session/paths';
import { mutationToken } from '@/lib/session/server';
import { SESSION_COOKIE_NAMES } from '@/lib/session/tokens';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** The signed PDFs by side, and TEMPLATE: the unsigned contract the system generates with the budget ceiling. */
const SIDES = new Set(['ADMIN', 'STUDIO', 'FINAL', 'TEMPLATE']);
const upstreamPath = (contractId: string, side: string) =>
  side === 'TEMPLATE'
    ? `/studio-portal/contracts/${contractId}/template`
    : `/studio-portal/contracts/${contractId}/documents/${side}/content`;

const fail = (status: number, message: string) => NextResponse.json({ error: { message } }, { status });

/** The link is opened by the browser itself, so an ended session goes to the login page rather than to a JSON error. */
function toLogin(request: NextRequest): NextResponse {
  const response = NextResponse.redirect(new URL(EXPIRED_LOGIN_PATH, request.url));
  for (const name of SESSION_COOKIE_NAMES) response.cookies.delete(name);
  return response;
}

/**
 * Downloads a contract PDF of the studio (the unsigned contract, Admin-signed, studio-signed or the merged FINAL copy) with the
 * session's token, which the browser never sees; the file is streamed through as the API sends it.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ contractId: string; side: string }> }) {
  const { contractId, side } = await context.params;
  if (!UUID.test(contractId) || !SIDES.has(side)) return fail(400, 'Đường dẫn tài liệu không hợp lệ.');
  const token = await mutationToken();
  if (!token) return toLogin(request);

  let upstream: Response;
  try {
    upstream = await fetch(`${getConfig().apiUrl}${upstreamPath(contractId, side)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
  } catch {
    return fail(502, 'Không kết nối được tới máy chủ AI Cinema');
  }
  if (upstream.status === 401) return toLogin(request);
  if (!upstream.ok || !upstream.body) {
    return fail(upstream.status === 404 ? 404 : 502, upstream.status === 404 ? 'Hợp đồng chưa có bản PDF này.' : 'Không tải được tài liệu.');
  }
  const headers = new Headers({ 'Content-Type': upstream.headers.get('content-type') ?? 'application/pdf' });
  for (const name of ['content-disposition', 'content-length']) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set('Cache-Control', 'private, no-store');
  return new NextResponse(upstream.body, { status: 200, headers });
}
