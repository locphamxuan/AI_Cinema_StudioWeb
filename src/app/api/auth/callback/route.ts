import { NextResponse, type NextRequest } from 'next/server';
import { getConfig } from '@/lib/config';
import { ApiError } from '@/lib/api/http';
import { oauthApi, sessionOfToken } from '@/lib/api/portal';
import { LOGIN_PATH } from '@/lib/session/paths';
import { OAUTH_COOKIE, readPending } from '@/lib/session/pkce';
import { sessionCookies } from '@/lib/session/tokens';

function toLogin(request: NextRequest, error: string): NextResponse {
  const url = new URL(LOGIN_PATH, request.url);
  url.searchParams.set('error', error);
  const response = NextResponse.redirect(url);
  response.cookies.delete({ name: OAUTH_COOKIE, path: '/api/auth' });
  return response;
}

/**
 * The redirect back from the consent screen (RFC 6749 §4.1.2): checks `state`, swaps the code and the PKCE
 * verifier for tokens server to server, and opens the studio session.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = request.nextUrl.searchParams;
  const pending = readPending(request.cookies.get(OAUTH_COOKIE)?.value);
  if (params.get('error')) return toLogin(request, params.get('error') === 'access_denied' ? 'denied' : 'oauth');
  const code = params.get('code');
  if (!pending || !code || params.get('state') !== pending.state) return toLogin(request, 'state');

  const config = getConfig();
  try {
    const token = await oauthApi(config.apiUrl, config.oauth).exchangeCode(code, config.oauth.redirectUri, pending.verifier);
    const response = NextResponse.redirect(new URL('/', request.url));
    for (const { name, value, options } of sessionCookies(sessionOfToken(token), config.secureCookies, 'oauth')) {
      response.cookies.set(name, value, options);
    }
    response.cookies.delete({ name: OAUTH_COOKIE, path: '/api/auth' });
    return response;
  } catch (error) {
    return toLogin(request, error instanceof ApiError && error.status === 0 ? 'network' : 'oauth');
  }
}
