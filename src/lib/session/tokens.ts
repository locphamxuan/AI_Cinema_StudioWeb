import { ApiError } from '@/lib/api/http';
import { authApi } from '@/lib/api/portal';
import type { AuthSession, AuthUser } from '@/lib/api/types';

/** httpOnly cookies of a studio session: the browser holds them, page scripts never read them. */
export const COOKIE = {
  access: 'sw_access',
  refresh: 'sw_refresh',
  /** Epoch milliseconds when the access token expires, so the proxy refreshes it in time. */
  expires: 'sw_expires',
} as const;

export const STUDIO_ROLE = 'STUDIO';
export const NOT_STUDIO_MESSAGE = 'Tài khoản không phải tài khoản Studio.';

/** Refresh tokens live as long as the API keeps them (JWT_REFRESH_TTL_DAYS, 30 days by default). */
const REFRESH_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
/** Refresh a minute early so a request never reaches the API with a token about to expire. */
const EXPIRY_SKEW_MS = 60_000;

export interface CookieWrite {
  name: string;
  value: string;
  options: { httpOnly: true; secure: boolean; sameSite: 'lax'; path: '/'; maxAge: number };
}

export function sessionCookies(session: AuthSession, secure: boolean, now = Date.now()): CookieWrite[] {
  const options = (maxAge: number) => ({ httpOnly: true as const, secure, sameSite: 'lax' as const, path: '/' as const, maxAge });
  const ttl = Math.max(1, Math.floor(session.accessTokenExpiresIn));
  return [
    { name: COOKIE.access, value: session.accessToken, options: options(ttl) },
    { name: COOKIE.expires, value: String(now + ttl * 1000), options: options(ttl) },
    { name: COOKIE.refresh, value: session.refreshToken, options: options(REFRESH_MAX_AGE_SECONDS) },
  ];
}

export const SESSION_COOKIE_NAMES = Object.values(COOKIE);

/** True when there is no usable access token: missing, or expiring within the skew. */
export function needsRefresh(access: string | undefined, expires: string | undefined, now = Date.now()): boolean {
  if (!access) return true;
  const at = Number(expires);
  return !Number.isFinite(at) || at - EXPIRY_SKEW_MS <= now;
}

export const isStudio = (user: Pick<AuthUser, 'role'> | null | undefined) => user?.role === STUDIO_ROLE;

// A refresh token works once: a second use signs every session out. Concurrent requests of one browser
// (prefetches, parallel route segments) therefore share the refresh that is already running.
const inFlight = new Map<string, Promise<AuthSession>>();

/** Swaps the refresh token for a new pair; rejects when the API refuses it or the account is not a studio. */
export function refreshSession(baseUrl: string, refreshToken: string): Promise<AuthSession> {
  const running = inFlight.get(refreshToken);
  if (running) return running;
  const promise = authApi(baseUrl)
    .refresh(refreshToken)
    .then((session) => {
      if (!isStudio(session.user)) throw new ApiError(403, 'FORBIDDEN', NOT_STUDIO_MESSAGE);
      return session;
    })
    .finally(() => {
      // Keep the answer a few seconds for requests that still carry the old token.
      setTimeout(() => inFlight.delete(refreshToken), 10_000).unref?.();
    });
  inFlight.set(refreshToken, promise);
  return promise;
}
