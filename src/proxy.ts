import { NextResponse, type NextRequest } from 'next/server';
import { getConfig } from '@/lib/config';
import { LOGIN_PATH } from '@/lib/session/paths';
import { COOKIE, kindOf, needsRefresh, refreshSession, SESSION_COOKIE_NAMES, sessionCookies } from '@/lib/session/tokens';

function toLogin(request: NextRequest, expired: boolean): NextResponse {
  const url = new URL(LOGIN_PATH, request.url);
  if (expired) url.searchParams.set('expired', '1');
  const response = NextResponse.redirect(url);
  for (const name of SESSION_COOKIE_NAMES) response.cookies.delete(name);
  return response;
}

/**
 * Every page needs a studio session. The access token is short-lived: when it is about to expire the proxy swaps
 * the refresh token for a new pair (rotation) before the page renders, and hands the new token to the page too.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const access = request.cookies.get(COOKIE.access)?.value;
  const refresh = request.cookies.get(COOKIE.refresh)?.value;
  const isLogin = request.nextUrl.pathname === LOGIN_PATH;
  const fresh = !needsRefresh(access, request.cookies.get(COOKIE.expires)?.value);

  // ?expired=1 means the API refused this token: going back to / would loop between the two pages.
  if (isLogin) {
    const stay = !fresh || request.nextUrl.searchParams.has('expired');
    return stay ? NextResponse.next() : NextResponse.redirect(new URL('/', request.url));
  }
  if (fresh) return NextResponse.next();
  if (!refresh) return toLogin(request, Boolean(access));

  try {
    const config = getConfig();
    const kind = kindOf(request.cookies.get(COOKIE.kind)?.value);
    const writes = sessionCookies(await refreshSession(config.apiUrl, refresh, kind), config.secureCookies, kind);
    for (const { name, value } of writes) request.cookies.set(name, value);
    const headers = new Headers(request.headers);
    headers.set('cookie', request.cookies.toString());
    const response = NextResponse.next({ request: { headers } });
    for (const { name, value, options } of writes) response.cookies.set(name, value, options);
    return response;
  } catch {
    return toLogin(request, true);
  }
}

export const config = {
  // Route handlers under /api check the session themselves (an upload body must not be buffered here).
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico).*)'],
};
