import { ACCESS_COOKIE, accessToken, codeMatches } from '@/lib/access';
import { getConfig } from '@/lib/config';
import { StudioError } from '@/lib/studio';
import { errorResponse } from '@/lib/session';

/** Checks the access code and, when right, remembers it in a cookie that holds a hash, not the code. */
export async function POST(request: Request): Promise<Response> {
  try {
    const { accessCode } = getConfig();
    const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
    if (!accessCode) return Response.json({ ok: true });
    if (typeof body?.code !== 'string' || !codeMatches(accessCode, body.code)) {
      throw new StudioError(401, 'Mã truy cập không đúng.');
    }
    const response = Response.json({ ok: true });
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    response.headers.append(
      'Set-Cookie',
      `${ACCESS_COOKIE}=${accessToken(accessCode)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 12}${secure}`,
    );
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
