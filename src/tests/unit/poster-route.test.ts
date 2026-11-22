import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const jar = new Map<string, string>();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    set: (name: string, value: string) => jar.set(name, value),
    delete: (name: string) => jar.delete(name),
  }),
}));

import { POST } from '@/app/api/projects/[projectId]/poster/route';
import { posterProblem, uploadPoster } from '@/lib/api/upload-poster';
import type { NextRequest } from 'next/server';

const PROJECT = '7f1c8a2e-5b4d-4c3a-9e2f-1a2b3c4d5e6f';
const call = (init: RequestInit, id = PROJECT) =>
  POST(new Request(`http://localhost:3100/api/projects/${id}/poster`, { method: 'POST', ...init }) as unknown as NextRequest, {
    params: Promise.resolve({ projectId: id }),
  });
const imageForm = () => {
  const form = new FormData();
  form.append('file', new File(['img'], 'poster.png', { type: 'image/png' }));
  return form;
};

beforeEach(() => {
  jar.clear();
  jar.set('sw_access', 'acc');
  jar.set('sw_expires', String(Date.now() + 600_000));
});
afterEach(() => vi.unstubAllGlobals());

describe('POST /api/projects/:id/poster', () => {
  it('rejects a malformed project id, a body that is not a file and a missing session', async () => {
    expect((await call({ body: imageForm() }, 'nope')).status).toBe(400);
    expect((await call({ headers: { 'content-type': 'application/json' }, body: '{}' })).status).toBe(400);
    jar.clear();
    expect((await call({ body: imageForm() })).status).toBe(401);
  });

  it('refuses a post from another site', async () => {
    const response = await call({ headers: { origin: 'https://evil.example', host: 'localhost:3100' }, body: imageForm() });
    expect(response.status).toBe(400);
  });

  it('streams the image to the poster endpoint of the API with the token', async () => {
    const answer = { studioPoster: { fileName: 'poster.png', uploadedAt: '2026-11-22T03:00:00.000Z' } };
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify(answer), { status: 201, headers: { 'content-type': 'application/json' } }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const response = await call({ body: imageForm() });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(answer);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`http://localhost:3001/api/studio-portal/projects/${PROJECT}/poster`);
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer acc');
    expect((init.headers as Record<string, string>)['Content-Type']).toMatch(/^multipart\/form-data; boundary=/);
  });

  it('answers 502 when the API cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('down'))));
    expect((await call({ body: imageForm() })).status).toBe(502);
  });
});

describe('poster upload helpers', () => {
  it('checks the image before it is sent', () => {
    expect(posterProblem(null)).toBe('Hãy chọn ảnh poster.');
    expect(posterProblem(new File(['x'], 'poster.pdf'))).toMatch(/^Poster phải là ảnh/);
    expect(posterProblem(new File([], 'poster.png'))).toBe('Tệp ảnh đang trống.');
    const big = new File(['x'], 'poster.jpg');
    Object.defineProperty(big, 'size', { value: 21 * 1024 * 1024 });
    expect(posterProblem(big)).toBe('Ảnh poster tối đa 20 MB.');
    expect(posterProblem(new File(['x'], 'Poster.WEBP'))).toBeNull();
  });

  it('posts the file to the Studio Web route and reads the saved poster', async () => {
    const studioPoster = { fileName: 'poster.png', uploadedAt: '2026-11-22T03:00:00.000Z' };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ studioPoster }), { status: 201 }));
    const result = await uploadPoster(PROJECT, new File(['x'], 'poster.png'), fetchMock as unknown as typeof fetch);
    expect(result).toEqual({ ok: true, studioPoster });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`/api/projects/${PROJECT}/poster`);
    expect((init.body as FormData).get('file')).toBeInstanceOf(File);
  });

  it('words an API error in Vietnamese and reports a lost connection', async () => {
    const body = { error: { code: 'BAD_REQUEST', message: 'Attach an image in the "file" field' } };
    const failing = vi.fn(async () => new Response(JSON.stringify(body), { status: 400 }));
    await expect(uploadPoster(PROJECT, new File(['x'], 'a.png'), failing as unknown as typeof fetch)).resolves.toEqual({
      ok: false,
      status: 400,
      error: 'Hãy đính kèm ảnh.',
    });
    const offline = vi.fn(async () => Promise.reject(new Error('offline')));
    await expect(uploadPoster(PROJECT, new File(['x'], 'a.png'), offline as unknown as typeof fetch)).resolves.toMatchObject({
      ok: false,
      status: 0,
    });
  });
});
