import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const jar = new Map<string, string>();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    set: (name: string, value: string) => jar.set(name, value),
    delete: (name: string) => jar.delete(name),
  }),
}));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));
const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));

import { logout } from '@/app/actions/auth';
import { markAllNotificationsRead } from '@/app/actions/notifications';
import { mutationToken, pagePortal, withPortal } from '@/lib/session/server';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const signedIn = () => {
  jar.set('sw_access', 'acc');
  jar.set('sw_expires', String(Date.now() + 600_000));
  jar.set('sw_refresh', 'ref');
};

beforeEach(() => {
  jar.clear();
  revalidatePath.mockClear();
});
afterEach(() => vi.unstubAllGlobals());

describe('pagePortal', () => {
  it('can be awaited and goes to the login page when the API refuses the token', async () => {
    jar.set('sw_access', 'acc');
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }, 401)));
    const api = await pagePortal();
    await expect(api.me()).rejects.toThrow('REDIRECT /login?expired=1');
  });

  it('passes on any other API error to the page', async () => {
    jar.set('sw_access', 'acc');
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: { code: 'NOT_FOUND', message: 'Project not found' } }, 404)));
    await expect((await pagePortal()).project('p1')).rejects.toMatchObject({ status: 404 });
  });

  it('sends a visitor without a session to the login page', async () => {
    await expect(pagePortal()).rejects.toThrow('REDIRECT /login');
  });
});

describe('mutationToken', () => {
  it('uses a fresh access token as it is', async () => {
    signedIn();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await mutationToken()).toBe('acc');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('swaps an expired access token and saves the new session', async () => {
    jar.set('sw_refresh', 'server-rotation-token');
    const session = { accessToken: 'new-acc', accessTokenExpiresIn: 1800, refreshToken: 'new-ref', user: { id: 'u', email: 'e', fullName: 'F', role: 'STUDIO' } };
    vi.stubGlobal('fetch', vi.fn(async () => json(session)));
    expect(await mutationToken()).toBe('new-acc');
    expect(jar.get('sw_access')).toBe('new-acc');
    expect(jar.get('sw_refresh')).toBe('new-ref');
  });

  it('ends the session when the refresh token is refused', async () => {
    jar.set('sw_access', 'old');
    jar.set('sw_refresh', 'server-refused-token');
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: { code: 'UNAUTHORIZED', message: 'no' } }, 401)));
    expect(await mutationToken()).toBeNull();
    expect(jar.size).toBe(0);
  });

  it('has nothing to offer without a refresh token', async () => {
    expect(await mutationToken()).toBeNull();
  });
});

describe('withPortal', () => {
  it('runs the mutation with the API of the session', async () => {
    signedIn();
    const fetchMock = vi.fn(async () => json({ id: 's', name: 'Lumen Studio' }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(withPortal((api) => api.me())).resolves.toMatchObject({ name: 'Lumen Studio' });
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/api/studio-portal/me', expect.anything());
  });

  it('throws a 401 the form can show when there is no session', async () => {
    await expect(withPortal((api) => api.me())).rejects.toMatchObject({ status: 401 });
  });
});

describe('logout', () => {
  it('revokes the refresh token, clears the cookies and goes to the login page', async () => {
    signedIn();
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(logout()).rejects.toThrow('REDIRECT /login');
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/api/auth/logout', expect.objectContaining({ body: '{"refreshToken":"ref"}' }));
    expect(jar.size).toBe(0);
  });

  it('still signs out when the API cannot be reached', async () => {
    signedIn();
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))));
    await expect(logout()).rejects.toThrow('REDIRECT /login');
    expect(jar.size).toBe(0);
  });
});

describe('markAllNotificationsRead', () => {
  it('marks every notification read and refreshes the overview', async () => {
    signedIn();
    const fetchMock = vi.fn(async () => json({ updated: 3 }));
    vi.stubGlobal('fetch', fetchMock);
    await markAllNotificationsRead();
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/api/notifications/read-all', expect.objectContaining({ method: 'PATCH' }));
    expect(revalidatePath).toHaveBeenCalledWith('/');
  });

  it('does not break the page when the session is gone', async () => {
    await expect(markAllNotificationsRead()).resolves.toBeUndefined();
    expect(revalidatePath).toHaveBeenCalledWith('/');
  });
});
