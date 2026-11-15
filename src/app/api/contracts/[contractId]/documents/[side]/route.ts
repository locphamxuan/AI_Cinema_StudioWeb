import { NextResponse, type NextRequest } from 'next/server';
import { getConfig } from '@/lib/config';
import { mutationToken } from '@/lib/session/server';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIDES = new Set(['ADMIN', 'STUDIO', 'FINAL']);

const fail = (status: number, message: string) => NextResponse.json({ error: { message } }, { status });

/**
 * Downloads a signed contract PDF of the studio (Admin-signed, studio-signed or the merged FINAL copy) with the
 * session's token, which the browser never sees; the file is streamed through as the API sends it.
 */
export async function GET(_request: NextRequest, context: { params: Promise<{ contractId: string; side: string }> }) {
  const { contractId, side } = await context.params;
  if (!UUID.test(contractId) || !SIDES.has(side)) return fail(400, 'Đường dẫn tài liệu không hợp lệ.');
  const token = await mutationToken();
  if (!token) return fail(401, 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');

  let upstream: Response;
  try {
    upstream = await fetch(`${getConfig().apiUrl}/studio-portal/contracts/${contractId}/documents/${side}/content`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
  } catch {
    return fail(502, 'Không kết nối được tới máy chủ AI Cinema');
  }
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
