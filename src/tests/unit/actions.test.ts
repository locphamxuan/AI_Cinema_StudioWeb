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
import { retryDelivery } from '@/app/actions/deliveries';

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

describe('retryDelivery', () => {
  const signedIn = () => {
    jar.set('sw_access', 'acc');
    jar.set('sw_expires', String(Date.now() + 600_000));
  };

  it('asks the API to process the failed delivery again', async () => {
    signedIn();
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => json({ id: 'm1', ingestStatus: 'PENDING' }));
    vi.stubGlobal('fetch', fetchMock);
    const state = await retryDelivery({}, form({ mediaAssetId: 'm1' }));
    expect(state.done).toContain('xử lý lại');
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3001/api/studio-portal/media-assets/m1/retry');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
  });

  it('shows why the API refused, e.g. a newer delivery exists', async () => {
    signedIn();
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: { code: 'CONFLICT', message: 'Only the latest failed delivery can be retried' } }, 409)));
    const state = await retryDelivery({}, form({ mediaAssetId: 'm1' }));
    expect(state.error).toBe('Không thể thực hiện ở trạng thái hiện tại: Only the latest failed delivery can be retried');
  });

  it('needs a delivery and a session', async () => {
    expect((await retryDelivery({}, form({}))).error).toBe('Yêu cầu không hợp lệ.');
    expect((await retryDelivery({}, form({ mediaAssetId: 'm1' }))).error).toContain('đăng nhập lại');
  });
});
