import { describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest, describeError } from '@/lib/api/http';
import { authApi, portalApi } from '@/lib/api/portal';

const BASE = 'http://api.test/api';

function fakeFetch(status: number, body?: unknown) {
  return vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () =>
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

describe('apiRequest', () => {
  it('sends the bearer token and JSON body, and returns the JSON answer', async () => {
    const fetchImpl = fakeFetch(200, { ok: 1 });
    const result = await apiRequest(BASE, '/x', { method: 'POST', token: 't0k', json: { a: 1 }, fetchImpl });
    expect(result).toEqual({ ok: 1 });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(`${BASE}/x`);
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe('{"a":1}');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer t0k');
  });

  it('returns undefined for 204', async () => {
    await expect(apiRequest(BASE, '/x', { fetchImpl: fakeFetch(204) })).resolves.toBeUndefined();
  });

  it('turns the API error body into an ApiError with its details', async () => {
    const fetchImpl = fakeFetch(400, { error: { code: 'BAD_REQUEST', message: 'The request is invalid', details: ['costVnd must be a multiple of 1,000 VND'] } });
    const error = await apiRequest(BASE, '/x', { fetchImpl }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, code: 'BAD_REQUEST', details: ['costVnd must be a multiple of 1,000 VND'] });
    expect(describeError(error)).toBe('Dữ liệu gửi lên không hợp lệ: costVnd must be a multiple of 1,000 VND');
  });

  it('reports a network failure in Vietnamese', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const error = await apiRequest(BASE, '/x', { fetchImpl }).catch((e: unknown) => e);
    expect(describeError(error)).toBe('Không kết nối được tới máy chủ AI Cinema');
  });

  it('describes a 409 with the message of the API', () => {
    expect(describeError(new ApiError(409, 'CONFLICT', 'The contract is not signed yet'))).toBe(
      'Không thể thực hiện ở trạng thái hiện tại: The contract is not signed yet',
    );
  });
});

describe('portalApi', () => {
  it('calls the studio-portal endpoints', async () => {
    const fetchImpl = fakeFetch(200, {});
    const api = portalApi(BASE, 'tok', fetchImpl);
    await api.me();
    await api.proposeCost('c1', 170_000_000);
    await api.signContract('c1');
    await api.counterCost('c1', 150_000_000);
    await api.project('p/1');
    await api.notifications(5);
    await api.markAllRead();
    const calls = fetchImpl.mock.calls.map(([url, init]) => [init?.method, url.replace(BASE, ''), init?.body]);
    expect(calls).toEqual([
      ['GET', '/studio-portal/me', undefined],
      ['POST', '/studio-portal/contracts/c1/propose', '{"costVnd":170000000}'],
      ['POST', '/studio-portal/contracts/c1/sign', undefined],
      ['POST', '/studio-portal/contracts/c1/counter', '{"costVnd":150000000}'],
      ['GET', '/studio-portal/projects/p%2F1', undefined],
      ['GET', '/notifications?limit=5&page=1', undefined],
      ['PATCH', '/notifications/read-all', undefined],
    ]);
  });

  it('logs in, refreshes and logs out with the account endpoints', async () => {
    const fetchImpl = fakeFetch(200, {});
    const auth = authApi(BASE, fetchImpl);
    await auth.login('studio@aicinema.com', 'pw');
    await auth.refresh('r1');
    await auth.logout('r2');
    expect(fetchImpl.mock.calls.map(([url, init]) => [url.replace(BASE, ''), init?.body])).toEqual([
      ['/auth/login', '{"email":"studio@aicinema.com","password":"pw"}'],
      ['/auth/refresh', '{"refreshToken":"r1"}'],
      ['/auth/logout', '{"refreshToken":"r2"}'],
    ]);
  });
});
