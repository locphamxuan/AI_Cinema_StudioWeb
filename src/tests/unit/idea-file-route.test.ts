import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const jar = new Map<string, string>();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined),
    set: (name: string, value: string) => jar.set(name, value),
    delete: (name: string) => jar.delete(name),
  }),
}));

import { GET } from '@/app/api/projects/[projectId]/idea-files/[fileId]/route';
import type { NextRequest } from 'next/server';

const PROJECT = '7f1c8a2e-5b4d-4c3a-9e2f-1a2b3c4d5e6f';
const FILE = '0b6f0c1e-5555-4a6b-9c55-000000000001';
const call = (fileId = FILE) =>
  GET(new Request(`http://localhost:3100/api/projects/${PROJECT}/idea-files/${fileId}`) as unknown as NextRequest, {
    params: Promise.resolve({ projectId: PROJECT, fileId }),
  });

beforeEach(() => {
  jar.clear();
  jar.set('sw_access', 'acc');
  jar.set('sw_expires', String(Date.now() + 600_000));
});
afterEach(() => vi.unstubAllGlobals());

describe('GET /api/projects/:projectId/idea-files/:fileId', () => {
  it('streams the file from the studio portal with the session token', async () => {
    const headers = { 'content-type': 'text/plain', 'content-disposition': "attachment; filename*=UTF-8''y-tuong.txt" };
    const fetchMock = vi.fn(async () => new Response('Ý tưởng', { status: 200, headers }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await call();

    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:3001/api/studio-portal/projects/${PROJECT}/idea-files/${FILE}/content`,
      { headers: { Authorization: 'Bearer acc' }, cache: 'no-store' },
    );
    expect(response.headers.get('content-type')).toBe('text/plain');
    expect(response.headers.get('content-disposition')).toContain('y-tuong.txt');
  });

  it('refuses a malformed id and words a removed file', async () => {
    const fetchMock = vi.fn(async () => new Response('', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);

    expect((await call('nope')).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    const gone = await call();
    expect(gone.status).toBe(404);
    expect(await gone.json()).toEqual({ error: { message: 'Tài liệu này không còn trong dự án.' } });
  });
});
