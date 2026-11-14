import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';
import { authorizeUrl, newState, newVerifier, OAUTH_COOKIE, OAUTH_COOKIE_MAX_AGE_SECONDS } from '@/lib/session/pkce';

/**
 * "Đăng nhập bằng tài khoản AI Cinema": sends the browser to the consent screen of AI_Cinema_FE with a fresh
 * `state` and PKCE challenge; the verifier stays in an httpOnly cookie for the callback.
 */
export function GET(): NextResponse {
  const config = getConfig();
  const pending = { state: newState(), verifier: newVerifier() };
  const response = NextResponse.redirect(authorizeUrl(config.oauth, pending));
  response.cookies.set(OAUTH_COOKIE, JSON.stringify(pending), {
    httpOnly: true,
    secure: config.secureCookies,
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}
