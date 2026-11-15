import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AuthSession } from '@/lib/api/types';
import { COOKIE, isStudio, needsRefresh, refreshSession, sessionCookies } from '@/lib/session/tokens';

const session = (role = 'STUDIO', refreshToken = 'refresh-2'): AuthSession => ({
  accessToken: 'access-2',
  accessTokenExpiresIn: 1800,
  refreshToken,
  user: { id: 'u', email: 'studio@aicinema.com', fullName: 'Lumen', role },
});

afterEach(() => vi.unstubAllGlobals());

describe('session cookies', () => {
  it('stores the tokens in httpOnly, SameSite=Lax cookies with the access expiry', () => {
    const cookies = sessionCookies(session(), true, 'oauth', 1_000);
    expect(cookies.map((c) => [c.name, c.value, c.options.maxAge])).toEqual([
      [COOKIE.access, 'access-2', 1800],
      [COOKIE.expires, String(1_000 + 1_800_000), 1800],
      [COOKIE.refresh, 'refresh-2', 30 * 24 * 3600],
      [COOKIE.kind, 'oauth', 30 * 24 * 3600],
    ]);
    expect(cookies.every((c) => c.options.httpOnly && c.options.secure && c.options.sameSite === 'lax')).toBe(true);
  });

  it('refreshes a missing or almost expired access token only', () => {
    const now = 1_000_000;
    expect(needsRefresh(undefined, String(now + 600_000), now)).toBe(true);
    expect(needsRefresh('a', undefined, now)).toBe(true);
    expect(needsRefresh('a', String(now + 30_000), now)).toBe(true);
    expect(needsRefresh('a', String(now + 600_000), now)).toBe(false);
  });

  it('accepts STUDIO accounts only', () => {
    expect(isStudio({ role: 'STUDIO' })).toBe(true);
    expect(isStudio({ role: 'ADMIN' })).toBe(false);
    expect(isStudio(null)).toBe(false);
  });
});

describe('refreshSession', () => {
  it('shares one refresh between concurrent requests (a refresh token works once)', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(session()), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const [a, b] = await Promise.all([
      refreshSession('http://api.test/api', 'shared-token'),
      refreshSession('http://api.test/api', 'shared-token'),
    ]);
    expect(a).toBe(b);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects a session that is not a studio account', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(session('ADMIN')), { status: 200 })));
    await expect(refreshSession('http://api.test/api', 'admin-token')).rejects.toThrow('Tài khoản không phải tài khoản Studio.');
  });

  it('rejects a refused refresh token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Invalid refresh token' } }), { status: 401 })),
    );
    await expect(refreshSession('http://api.test/api', 'bad-token')).rejects.toMatchObject({ status: 401 });
  });
});
