import { NextResponse, type NextRequest } from 'next/server';
import { getConfig } from '@/lib/config';
import { fail, sameOrigin, UUID } from '@/lib/session/route-forward';
import { mutationToken } from '@/lib/session/server';

/**
 * Sends the poster image of a project to the AI Cinema API with the studio's token, which the browser never sees.
 * The multipart body is streamed through unread, like a film upload.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await context.params;
  if (!UUID.test(projectId)) return fail(400, 'Mã dự án không hợp lệ.');
  if (!sameOrigin(request)) return fail(400, 'Yêu cầu không đến từ Studio Web.');

  const token = await mutationToken();
  if (!token) return fail(401, 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.startsWith('multipart/form-data')) return fail(400, 'Định dạng yêu cầu không hợp lệ.');

  let upstream: Response;
  try {
    upstream = await fetch(`${getConfig().apiUrl}/studio-portal/projects/${projectId}/poster`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': contentType, Accept: 'application/json' },
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
