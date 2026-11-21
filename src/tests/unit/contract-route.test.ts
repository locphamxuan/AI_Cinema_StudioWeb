import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const jar = new Map<string, string>();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    set: (name: string, value: string) => jar.set(name, value),
    delete: (name: string) => jar.delete(name),
  }),
}));

import { GET } from '@/app/api/contracts/[contractId]/documents/[side]/route';
import type { NextRequest } from 'next/server';

const CONTRACT = '7f1c8a2e-5b4d-4c3a-9e2f-1a2b3c4d5e6f';
const call = (side: string, id = CONTRACT) =>
  GET(new Request(`http://localhost:3100/api/contracts/${id}/documents/${side}`) as unknown as NextRequest, {
    params: Promise.resolve({ contractId: id, side }),
  });
const signIn = () => {
  jar.set('sw_access', 'acc');
  jar.set('sw_expires', String(Date.now() + 600_000));
};

beforeEach(() => {
  jar.clear();
  signIn();
});
afterEach(() => vi.unstubAllGlobals());

describe('GET /api/contracts/:id/documents/:side', () => {
  it('downloads the unsigned contract the system generates, with the session token', async () => {
    const headers = { 'content-disposition': 'attachment; filename="hop-dong.pdf"', 'content-length': '8' };
    const fetchMock = vi.fn(async () => new Response('%PDF-1.7', { status: 200, headers }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await call('TEMPLATE');

    expect(fetchMock).toHaveBeenCalledWith(`http://localhost:3001/api/studio-portal/contracts/${CONTRACT}/template`, {
      headers: { Authorization: 'Bearer acc' },
      cache: 'no-store',
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-disposition')).toBe('attachment; filename="hop-dong.pdf"');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('downloads a signed side from its own endpoint, as a PDF when the API names no type', async () => {
    const answer = new Response('%PDF', { status: 200 });
    answer.headers.delete('content-type');
    const fetchMock = vi.fn(async () => answer);
    vi.stubGlobal('fetch', fetchMock);
    const response = await call('FINAL');
    expect(fetchMock.mock.calls[0]).toEqual([
      `http://localhost:3001/api/studio-portal/contracts/${CONTRACT}/documents/FINAL/content`,
      expect.anything(),
    ]);
    expect(response.headers.get('content-type')).toBe('application/pdf');
  });

  it('refuses a malformed id or side', async () => {
    expect((await call('TEMPLATE', 'nope')).status).toBe(400);
    expect((await call('OTHER')).status).toBe(400);
  });

  it('sends the studio to the login page without a session, or when the API refuses the token', async () => {
    jar.clear();
    expect((await call('TEMPLATE')).headers.get('location')).toContain('/login?expired=1');
    signIn();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 401 })));
    expect((await call('TEMPLATE')).headers.get('location')).toContain('/login?expired=1');
  });

  it('explains a missing PDF, an API error and an unreachable API', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 404 })));
    expect((await call('STUDIO')).status).toBe(404);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 500 })));
    expect((await call('STUDIO')).status).toBe(502);
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('down'))));
    const offline = await call('STUDIO');
    expect(offline.status).toBe(502);
    expect(await offline.json()).toEqual({ error: { message: 'Không kết nối được tới máy chủ AI Cinema' } });
  });
});
