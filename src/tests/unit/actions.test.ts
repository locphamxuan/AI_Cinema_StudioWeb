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
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { login } from '@/app/actions/auth';
import { actOnContract } from '@/app/actions/contracts';
import { POST } from '@/app/api/episodes/[episodeId]/media/route';
import { pagePortal } from '@/lib/session/server';
import type { NextRequest } from 'next/server';

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const authSession = (role: string) => ({
  accessToken: 'acc',
  accessTokenExpiresIn: 1800,
  refreshToken: 'ref-ref-ref-ref-ref-ref',
  user: { id: 'u', email: 'x@y.z', fullName: 'X', role },
});

beforeEach(() => jar.clear());
afterEach(() => vi.unstubAllGlobals());

describe('login', () => {
  it('refuses an account that is not a studio and revokes its session', async () => {
    const fetchMock = vi.fn(async (url: string) => (url.endsWith('/auth/login') ? json(authSession('ADMIN')) : new Response(null, { status: 204 })));
    vi.stubGlobal('fetch', fetchMock);
    const state = await login({}, form({ email: 'admin@aicinema.com', password: 'pw' }));
    expect(state.error).toBe('Tài khoản không phải tài khoản Studio.');
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'http://localhost:3001/api/auth/login',
      'http://localhost:3001/api/auth/logout',
    ]);
    expect(jar.size).toBe(0);
  });

  it('stores the session of a studio account and goes to the overview', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json(authSession('STUDIO'))));
    await expect(login({}, form({ email: 'studio@aicinema.com', password: 'pw' }))).rejects.toThrow('REDIRECT /');
    expect(jar.get('sw_access')).toBe('acc');
    expect(jar.get('sw_refresh')).toBe('ref-ref-ref-ref-ref-ref');
  });

  it('shows the API error of a wrong password', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } }, 401)));
    const state = await login({}, form({ email: 'studio@aicinema.com', password: 'bad' }));
    expect(state.error).toBe('Email hoặc mật khẩu không đúng.');
  });
});

describe('pagePortal', () => {
  it('can be awaited and goes to the login page when the API refuses the token', async () => {
    jar.set('sw_access', 'acc');
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }, 401)));
    const api = await pagePortal();
    await expect(api.me()).rejects.toThrow('REDIRECT /login?expired=1');
  });

  it('sends a visitor without a session to the login page', async () => {
    await expect(pagePortal()).rejects.toThrow('REDIRECT /login');
  });
});

describe('actOnContract', () => {
  const signedIn = () => {
    jar.set('sw_access', 'acc');
    jar.set('sw_expires', String(Date.now() + 600_000));
  };

  it('checks the cost before calling the API', async () => {
    signedIn();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const state = await actOnContract({}, form({ contractId: 'c1', action: 'propose', costVnd: '1500', agree: 'on' }));
    expect(state.error).toBe('Giá phải là bội số của 1.000 VND.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('needs the terms accepted', async () => {
    signedIn();
    const state = await actOnContract({}, form({ contractId: 'c1', action: 'sign' }));
    expect(state.error).toContain('đồng ý điều khoản');
  });

  it('proposes the cost and reports the API refusal', async () => {
    signedIn();
    const fetchMock = vi.fn<(url: string) => Promise<Response>>(async () => json({ error: { code: 'CONFLICT', message: 'The contract is not waiting for the studio' } }, 409));
    vi.stubGlobal('fetch', fetchMock);
    const state = await actOnContract({}, form({ contractId: 'c1', action: 'propose', costVnd: '170.000.000', agree: 'on' }));
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3001/api/studio-portal/contracts/c1/propose');
    expect(state.error).toBe('Không thể thực hiện ở trạng thái hiện tại: The contract is not waiting for the studio');
  });

  it('asks to log in again without a session', async () => {
    const state = await actOnContract({}, form({ contractId: 'c1', action: 'sign', agree: 'on' }));
    expect(state.error).toContain('đăng nhập lại');
  });
});

describe('POST /api/episodes/:id/media', () => {
  const EPISODE = '7f1c8a2e-5b4d-4c3a-9e2f-1a2b3c4d5e6f';
  const call = (id: string, init: RequestInit) =>
    POST(new Request(`http://localhost:3100/api/episodes/${id}/media`, init) as unknown as NextRequest, {
      params: Promise.resolve({ episodeId: id }),
    });

  it('rejects a malformed episode id', async () => {
    expect((await call('nope', { method: 'POST' })).status).toBe(400);
  });

  it('needs a session', async () => {
    const response = await call(EPISODE, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    expect(response.status).toBe(401);
  });

  it('forwards a link submission with the token and returns the API answer', async () => {
    jar.set('sw_access', 'acc');
    jar.set('sw_expires', String(Date.now() + 600_000));
    const fetchMock = vi.fn(async () => json({ error: { code: 'CONFLICT', message: 'The contract of this project is not signed yet' } }, 409));
    vi.stubGlobal('fetch', fetchMock);
    const response = await call(EPISODE, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"a":1}' });
    expect(response.status).toBe(409);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`http://localhost:3001/api/studio-portal/episodes/${EPISODE}/media`);
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer acc');
  });
});
