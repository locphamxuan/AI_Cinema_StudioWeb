import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const jar = new Map<string, string>();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    set: (name: string, value: string) => jar.set(name, value),
    delete: (name: string) => jar.delete(name),
  }),
}));

import { POST } from '@/app/api/episodes/[episodeId]/media/route';
import type { NextRequest } from 'next/server';

const EPISODE = '7f1c8a2e-5b4d-4c3a-9e2f-1a2b3c4d5e6f';
const call = (init: RequestInit, id = EPISODE) =>
  POST(new Request(`http://localhost:3100/api/episodes/${id}/media`, { method: 'POST', ...init }) as unknown as NextRequest, {
    params: Promise.resolve({ episodeId: id }),
  });

beforeEach(() => {
  jar.clear();
  jar.set('sw_access', 'acc');
  jar.set('sw_expires', String(Date.now() + 600_000));
});
afterEach(() => vi.unstubAllGlobals());

describe('POST /api/episodes/:id/media', () => {
  it('rejects a malformed episode id', async () => {
    expect((await call({}, 'nope')).status).toBe(400);
  });

  it('needs a session', async () => {
    jar.clear();
    const response = await call({ headers: { 'content-type': 'application/json' }, body: '{}' });
    expect(response.status).toBe(401);
  });

  it('forwards a link submission with the token and returns the API answer', async () => {
    const body = { error: { code: 'CONFLICT', message: 'The contract of this project is not signed yet' } };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status: 409 }));
    vi.stubGlobal('fetch', fetchMock);
    const response = await call({ headers: { 'content-type': 'application/json' }, body: '{"a":1}' });
    expect(response.status).toBe(409);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`http://localhost:3001/api/studio-portal/episodes/${EPISODE}/media`);
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer acc');
  });

  it('refuses a post from another site', async () => {
    const response = await call({ headers: { origin: 'https://evil.example', host: 'localhost:3100', 'content-type': 'application/json' }, body: '{}' });
    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toBe('Yêu cầu không đến từ Studio Web.');
  });

  it('accepts its own origin behind a proxy', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 201, headers: { 'content-type': 'application/json' } })));
    const response = await call({
      headers: { origin: 'https://studio.example', 'x-forwarded-host': 'studio.example', 'content-type': 'application/json' },
      body: '{}',
    });
    expect(response.status).toBe(201);
  });

  it('refuses a body that is neither a file nor a link', async () => {
    const response = await call({ headers: { 'content-type': 'text/plain' }, body: 'film' });
    expect(response.status).toBe(400);
  });

  it('streams a file to the upload endpoint of the API', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const form = new FormData();
    form.append('file', new File(['x'], 'tap-1.mp4'));
    const response = await call({ body: form });
    expect(response.status).toBe(204);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`http://localhost:3001/api/studio-portal/episodes/${EPISODE}/media/upload`);
    expect((init.headers as Record<string, string>)['Content-Type']).toMatch(/^multipart\/form-data; boundary=/);
  });

  it('answers 502 when the API cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('offline'))));
    const response = await call({ headers: { 'content-type': 'application/json' }, body: '{}' });
    expect(response.status).toBe(502);
    expect((await response.json()).error.code).toBe('NETWORK');
  });
});
