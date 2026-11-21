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
  unstable_rethrow: (error: unknown) => {
    if (error instanceof Error && error.message.startsWith('REDIRECT')) throw error;
  },
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { login, logout } from '@/app/actions/auth';
import { actOnContract } from '@/app/actions/contracts';
import { retryDelivery } from '@/app/actions/deliveries';

const form = (fields: Record<string, string>, file?: File) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  if (file) data.set('file', file);
  return data;
};
const signedPdf = () => new File(['%PDF-1.4 signed'], 'hop-dong.pdf', { type: 'application/pdf' });

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
    expect(state.error).toBe('Đây không phải tài khoản Studio.');
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'http://localhost:3001/api/auth/login',
      'http://localhost:3001/api/auth/logout',
    ]);
    expect(jar.size).toBe(0);
  });

  it('still refuses a non-studio account when revoking its session fails', async () => {
    const fetchMock = vi.fn(async (url: string) => (url.endsWith('/auth/login') ? json(authSession('ADMIN')) : Promise.reject(new Error('offline'))));
    vi.stubGlobal('fetch', fetchMock);
    const state = await login({}, form({ email: 'admin@aicinema.com', password: 'pw' }));
    expect(state.error).toBe('Đây không phải tài khoản Studio.');
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

  it('asks for both fields before calling the API, and explains any other refusal', async () => {
    const fetchMock = vi.fn(async () => json({ error: { code: 'INTERNAL', message: 'Down for maintenance' } }, 503));
    vi.stubGlobal('fetch', fetchMock);
    expect((await login({}, new FormData())).error).toBe('Vui lòng nhập email và mật khẩu.');
    expect(fetchMock).not.toHaveBeenCalled();
    const state = await login({}, form({ email: 'studio@aicinema.com', password: 'pw' }));
    expect(state.error).toBe('Lỗi máy chủ (503).');
  });
});

describe('logout', () => {
  it('ends the session at the API, clears the cookies and goes to the login page', async () => {
    const fetchMock = vi.fn<(url: string) => Promise<Response>>(async () => Promise.reject(new Error('offline')));
    vi.stubGlobal('fetch', fetchMock);
    jar.set('sw_access', 'acc');
    jar.set('sw_refresh', 'ref');
    await expect(logout()).rejects.toThrow('REDIRECT /login');
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3001/api/auth/logout');
    expect(jar.size).toBe(0);
    fetchMock.mockClear();
    await expect(logout()).rejects.toThrow('REDIRECT /login');
    expect(fetchMock).not.toHaveBeenCalled();
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
    const state = await actOnContract(
      {},
      form({ contractId: 'c1', action: 'propose', priceMode: 'lower', costVnd: '1500', agree: 'on' }, signedPdf()),
    );
    expect(state.error).toBe('Giá phải là bội số của 1.000 VND.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('needs the terms accepted', async () => {
    signedIn();
    const state = await actOnContract({}, form({ contractId: 'c1', action: 'sign' }));
    expect(state.error).toContain('đồng ý điều khoản');
  });

  it('needs the signed contract PDF, and a PDF only', async () => {
    signedIn();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const missing = await actOnContract({}, form({ contractId: 'c1', action: 'sign', agree: 'on' }));
    expect(missing.error).toBe('Vui lòng đính kèm file PDF hợp đồng Studio đã ký.');
    const image = new File(['x'], 'scan.png', { type: 'image/png' });
    const wrong = await actOnContract({}, form({ contractId: 'c1', action: 'sign', agree: 'on' }, image));
    expect(wrong.error).toBe('Hợp đồng đã ký phải là file PDF.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('signs at the budget without sending a cost', async () => {
    signedIn();
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => json({ id: 'c1' }));
    vi.stubGlobal('fetch', fetchMock);
    const state = await actOnContract(
      {},
      form({ contractId: 'c1', action: 'propose', priceMode: 'budget', costVnd: '1500', agree: 'on' }, signedPdf()),
    );
    const sent = fetchMock.mock.calls[0][1]?.body as FormData;
    expect(sent.has('costVnd')).toBe(false);
    expect(state.done).toBe('Đã gửi hợp đồng Studio đã ký. Chờ Admin ký.');
  });

  it('proposes a lower cost and reports the API refusal', async () => {
    signedIn();
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => json({ error: { code: 'CONFLICT', message: 'This project already has a contract' } }, 409));
    vi.stubGlobal('fetch', fetchMock);
    const state = await actOnContract(
      {},
      form({ contractId: 'c1', action: 'propose', priceMode: 'lower', costVnd: '170.000.000', agree: 'on' }, signedPdf()),
    );
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3001/api/studio-portal/contracts/c1/propose');
    const sent = fetchMock.mock.calls[0][1]?.body as FormData;
    expect(sent.get('costVnd')).toBe('170000000');
    expect((sent.get('file') as File).name).toBe('hop-dong.pdf');
    expect(state.error).toBe('Dự án đã có hợp đồng.');
  });

  it('counters with the cost typed, and refuses a malformed request or a missing cost', async () => {
    signedIn();
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => json({ id: 'c2' }));
    vi.stubGlobal('fetch', fetchMock);
    const done = await actOnContract({}, form({ contractId: 'c1', action: 'counter', costVnd: '160000000', agree: 'on' }, signedPdf()));
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3001/api/studio-portal/contracts/c1/counter');
    expect((fetchMock.mock.calls[0][1]?.body as FormData).get('costVnd')).toBe('160000000');
    expect(done.done).toContain('đề xuất giá mới');
    const missing = await actOnContract({}, form({ contractId: 'c1', action: 'counter', agree: 'on' }, signedPdf()));
    expect(missing.error).toBe('Vui lòng nhập giá sản xuất.');
    expect((await actOnContract({}, new FormData())).error).toBe('Yêu cầu không hợp lệ.');
  });

  it('sends the studio to the login page without a session', async () => {
    await expect(actOnContract({}, form({ contractId: 'c1', action: 'sign', agree: 'on' }, signedPdf()))).rejects.toThrow(
      'REDIRECT /login?expired=1',
    );
  });

  it('ends the session when the API refuses the token', async () => {
    signedIn();
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }, 401)));
    await expect(actOnContract({}, form({ contractId: 'c1', action: 'sign', agree: 'on' }, signedPdf()))).rejects.toThrow(
      'REDIRECT /login?expired=1',
    );
    expect(jar.size).toBe(0);
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
    vi.stubGlobal('fetch', vi.fn(async () => json({ error: { code: 'CONFLICT', message: 'A newer version was delivered; retry that one' } }, 409)));
    const state = await retryDelivery({}, form({ mediaAssetId: 'm1' }));
    expect(state.error).toBe('Đã có bản phim mới hơn được nộp; hãy xử lý lại bản đó.');
  });

  it('needs a delivery and a session', async () => {
    expect((await retryDelivery({}, form({}))).error).toBe('Yêu cầu không hợp lệ.');
    await expect(retryDelivery({}, form({ mediaAssetId: 'm1' }))).rejects.toThrow('REDIRECT /login?expired=1');
  });
});
