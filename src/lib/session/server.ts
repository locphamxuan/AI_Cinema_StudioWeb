import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getConfig } from '@/lib/config';
import { ApiError } from '@/lib/api/http';
import { portalApi, type PortalApi } from '@/lib/api/portal';
import type { AuthSession } from '@/lib/api/types';
import { EXPIRED_LOGIN_PATH, LOGIN_PATH } from './paths';
import { COOKIE, needsRefresh, refreshSession, SESSION_COOKIE_NAMES, sessionCookies } from './tokens';

/** Writes a new session (login, refresh): only Server Actions and Route Handlers may call this. */
export async function saveSession(session: AuthSession): Promise<void> {
  const store = await cookies();
  for (const { name, value, options } of sessionCookies(session, getConfig().secureCookies)) store.set(name, value, options);
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  for (const name of SESSION_COOKIE_NAMES) store.delete(name);
}

/** The API of the logged-in studio for a page; no session, or one the API refuses, goes to the login page. */
export async function pagePortal(): Promise<PortalApi> {
  const store = await cookies();
  const token = store.get(COOKIE.access)?.value;
  if (!token) redirect(LOGIN_PATH);
  const api = portalApi(getConfig().apiUrl, token);
  const guarded = Object.entries(api).map(([key, call]) => [
    key,
    async (...args: unknown[]) => {
      try {
        return await (call as (...inner: unknown[]) => Promise<unknown>)(...args);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) redirect(EXPIRED_LOGIN_PATH);
        throw error;
      }
    },
  ]);
  return Object.fromEntries(guarded) as PortalApi;
}

/**
 * The access token for a mutation (Server Action, Route Handler), refreshed first when it is about to expire.
 * Null when the studio has to log in again.
 */
export async function mutationToken(): Promise<string | null> {
  const store = await cookies();
  const access = store.get(COOKIE.access)?.value;
  if (!needsRefresh(access, store.get(COOKIE.expires)?.value)) return access ?? null;
  const refresh = store.get(COOKIE.refresh)?.value;
  if (!refresh) return null;
  try {
    const session = await refreshSession(getConfig().apiUrl, refresh);
    await saveSession(session);
    return session.accessToken;
  } catch {
    await clearSession();
    return null;
  }
}

/** Runs a mutation with the studio's API; a missing session throws a 401 ApiError the form shows. */
export async function withPortal<T>(run: (api: PortalApi) => Promise<T>): Promise<T> {
  const token = await mutationToken();
  if (!token) throw new ApiError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập lại.');
  return run(portalApi(getConfig().apiUrl, token));
}
