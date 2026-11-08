import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';

const request = (path: string, cookies: Record<string, string> = {}) =>
  new NextRequest(`http://localhost:3100${path}`, {
    headers: { cookie: Object.entries(cookies).map(([name, value]) => `${name}=${value}`).join('; ') },
  });
const fresh = () => ({ sw_access: 'acc', sw_expires: String(Date.now() + 600_000) });
const passedThrough = (response: Response) => response.headers.get('x-middleware-next') === '1';

afterEach(() => vi.unstubAllGlobals());

describe('proxy', () => {
  it('sends a visitor without a session to the login page', async () => {
    const response = await proxy(request('/contracts'));
    expect(response.headers.get('location')).toBe('http://localhost:3100/login');
  });

  it('lets a valid session through without calling the API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(passedThrough(await proxy(request('/contracts', fresh())))).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('skips the login page for a valid session, unless the API refused that token (no redirect loop)', async () => {
    expect((await proxy(request('/login', fresh()))).headers.get('location')).toBe('http://localhost:3100/');
    expect(passedThrough(await proxy(request('/login?expired=1', fresh())))).toBe(true);
  });

  it('swaps an expired access token and gives the new pair to the browser and the page', async () => {
    const session = { accessToken: 'new-acc', accessTokenExpiresIn: 1800, refreshToken: 'new-ref', user: { id: 'u', email: 'e', fullName: 'F', role: 'STUDIO' } };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(session), { status: 200 })));
    const response = await proxy(request('/projects', { sw_refresh: 'proxy-rotation-token' }));
    expect(response.cookies.get('sw_access')?.value).toBe('new-acc');
    expect(response.cookies.get('sw_refresh')?.value).toBe('new-ref');
    expect(response.headers.get('x-middleware-request-cookie')).toContain('sw_access=new-acc');
  });

  it('ends the session when the refresh token is refused', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'no' } }), { status: 401 })));
    const response = await proxy(request('/projects', { sw_refresh: 'proxy-refused-token' }));
    expect(response.headers.get('location')).toBe('http://localhost:3100/login?expired=1');
    expect(response.cookies.get('sw_refresh')?.value).toBe('');
  });
});
