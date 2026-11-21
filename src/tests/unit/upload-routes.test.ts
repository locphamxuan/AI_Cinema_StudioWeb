import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const jar = new Map<string, string>();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    set: (name: string, value: string) => jar.set(name, value),
    delete: (name: string) => jar.delete(name),
  }),
}));

import { POST as start } from '@/app/api/episodes/[episodeId]/media/uploads/route';
import { POST as complete } from '@/app/api/episodes/[episodeId]/media/uploads/complete/route';
import type { NextRequest } from 'next/server';

const EPISODE = '7f1c8a2e-5b4d-4c3a-9e2f-1a2b3c4d5e6f';
const call = (handler: typeof start, init: RequestInit = {}, id = EPISODE) =>
  handler(
    new Request(`http://localhost:3100/api/episodes/${id}/media/uploads`, {
      method: 'POST',
      body: '{"fileName":"tap.mp4","sizeBytes":3}',
      ...init,
    }) as unknown as NextRequest,
    { params: Promise.resolve({ episodeId: id }) },
  );

beforeEach(() => {
  jar.clear();
  jar.set('sw_access', 'acc');
  jar.set('sw_expires', String(Date.now() + 600_000));
});
afterEach(() => vi.unstubAllGlobals());

describe('direct upload routes', () => {
  it('forwards the start and the completion to the API with the session token', async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
      async () => new Response('{"uploadUrl":"u"}', { status: 200, headers: { 'content-type': 'application/json' } }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const started = await call(start);
    await call(complete, { body: '{"uploadToken":"t"}' });

    expect(started.status).toBe(200);
    expect(await started.json()).toEqual({ uploadUrl: 'u' });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `http://localhost:3001/api/studio-portal/episodes/${EPISODE}/media/uploads`,
      `http://localhost:3001/api/studio-portal/episodes/${EPISODE}/media/uploads/complete`,
    ]);
    expect(fetchMock.mock.calls[1][1]).toMatchObject({
      method: 'POST',
      headers: { Authorization: 'Bearer acc', 'Content-Type': 'application/json' },
      body: '{"uploadToken":"t"}',
    });
  });

  it('passes an empty API answer through, as JSON when the API names no type', async () => {
    const answer = new Response(null, { status: 501 });
    answer.headers.delete('content-type');
    vi.stubGlobal('fetch', vi.fn(async () => answer));
    const res = await call(start);
    expect(res.status).toBe(501);
    expect(res.headers.get('content-type')).toBe('application/json');
  });

  it('refuses a malformed episode, another origin, a missing session and an unreachable API', async () => {
    expect((await call(start, {}, 'nope')).status).toBe(400);
    expect((await call(start, { headers: { origin: 'https://evil.example' } })).status).toBe(400);
    expect((await call(start, { headers: { origin: '::not a url' } })).status).toBe(400);
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('down'))));
    expect((await call(start)).status).toBe(502);
    jar.clear();
    expect((await call(start)).status).toBe(401);
  });
});
