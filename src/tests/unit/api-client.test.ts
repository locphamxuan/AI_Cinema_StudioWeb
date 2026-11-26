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
    expect(describeError(error)).toBe('Dữ liệu gửi lên không hợp lệ. Số tiền phải tròn nghìn đồng.');
    // A validation detail the API words in English only is left out rather than shown in English.
    const unknown = new ApiError(400, 'BAD_REQUEST', 'The request is invalid', ['foo must be a bar']);
    expect(describeError(unknown)).toBe('Dữ liệu gửi lên không hợp lệ.');
  });

  it('words the signature and legal profile refusals of the API in Vietnamese', () => {
    const say = (message: string, status = 400) => describeError(new ApiError(status, 'BAD_REQUEST', message));
    expect(say('The signature image is 120x40 px; it must be at least 150x50 px')).toBe(
      'Ảnh chữ ký chỉ có 120x40 px; cần ít nhất 150x50 px.',
    );
    expect(say('The signature image must be at most 2097152 bytes')).toBe('Ảnh chữ ký tối đa 2 MB.');
    expect(say('File too large', 413)).toBe('Tệp vượt quá dung lượng cho phép.');
    expect(say('taxCode must be 10 digits, or 10 digits followed by "-" and 3 digits')).toContain('Mã số thuế gồm 10 chữ số');
    expect(say('The project has no production budget left to sign this contract for; ask the Admin to add budget', 409)).toContain(
      'không còn ngân sách sản xuất',
    );
  });

  it('reports a network failure in Vietnamese', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    const error = await apiRequest(BASE, '/x', { fetchImpl }).catch((e: unknown) => e);
    expect(describeError(error)).toBe('Không kết nối được tới máy chủ AI Cinema');
  });

  it('describes a 409 with the message of the API', () => {
    expect(describeError(new ApiError(409, 'CONFLICT', 'The contract of this project is not signed by both sides yet'))).toBe(
      'Hợp đồng của dự án chưa được hai bên ký.',
    );
    expect(describeError(new ApiError(409, 'CONFLICT', 'Studio "Sao Việt" is deactivated', ['reason: STUDIO_INACTIVE']))).toBe(
      'Studio "Sao Việt" đã ngừng hoạt động.',
    );
    expect(describeError(new Error('Plain failure'))).toBe('Đã có lỗi xảy ra.');
  });
});

describe('portalApi', () => {
  it('calls the studio-portal endpoints', async () => {
    const fetchImpl = fakeFetch(200, {});
    const api = portalApi(BASE, 'tok', fetchImpl);
    await api.me();
    await api.profile();
    const profile = { address: 'Số 1', taxCode: '0312345678', bankAccount: '0123456', bankName: 'ACB', representativeTitle: 'GĐ' };
    await api.updateProfile(profile);
    const signature = new File(['png'], 'ky.png', { type: 'image/png' });
    await api.proposeCost('c1', 170_000_000, signature);
    await api.signContract('c1', signature);
    await api.counterCost('c1', 150_000_000, signature);
    await api.project('p/1');
    await api.notifications(5, 2);
    await api.unreadCount();
    await api.markRead('n/1');
    await api.markAllRead();
    await api.retryDelivery('m/1');
    const bodyOf = (body: unknown) =>
      body instanceof FormData ? `form:${[...body.keys()].join(',')}:${String(body.get('costVnd'))}` : body;
    const calls = fetchImpl.mock.calls.map(([url, init]) => [init?.method, url.replace(BASE, ''), bodyOf(init?.body)]);
    expect(calls).toEqual([
      ['GET', '/studio-portal/me', undefined],
      ['GET', '/studio-portal/profile', undefined],
      ['PUT', '/studio-portal/profile', JSON.stringify(profile)],
      ['POST', '/studio-portal/contracts/c1/propose', 'form:file,costVnd:170000000'],
      ['POST', '/studio-portal/contracts/c1/sign', 'form:file:null'],
      ['POST', '/studio-portal/contracts/c1/counter', 'form:file,costVnd:150000000'],
      ['GET', '/studio-portal/projects/p%2F1', undefined],
      ['GET', '/notifications?limit=5&page=2', undefined],
      ['GET', '/notifications/unread-count', undefined],
      ['PATCH', '/notifications/n%2F1/read', undefined],
      ['PATCH', '/notifications/read-all', undefined],
      ['POST', '/studio-portal/media-assets/m%2F1/retry', undefined],
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
