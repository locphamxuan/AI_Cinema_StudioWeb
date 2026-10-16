import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as upload } from '@/app/api/films/route';
import { DELETE as remove } from '@/app/api/films/[id]/route';
import { GET as download } from '@/app/films/[id]/[name]/route';
import { POST as reply } from '@/app/api/messages/[id]/reply/route';
import { readSent } from '@/lib/sent-log';
import { MP4 } from './video-fixture';

vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));

let dataDir: string;
beforeEach(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), 'studio-upload-routes-'));
  vi.stubEnv('MAIL_SOURCE', 'fixtures');
  vi.stubEnv('DATA_DIR', dataDir);
  vi.stubEnv('STUDIO_ACCESS_CODE', '');
  vi.stubEnv('PUBLIC_BASE_URL', 'https://studio.example');
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(dataDir, { recursive: true, force: true });
});

const send = (name: string, bytes: Buffer) =>
  upload(new Request('http://studio.test/api/films', { method: 'POST', headers: { 'x-file-name': encodeURIComponent(name) }, body: new Uint8Array(bytes) }));
const json = (body: unknown) =>
  new Request('http://studio.test/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const params = <T extends Record<string, string>>(value: T) => ({ params: Promise.resolve(value) });

describe('uploading a video', () => {
  it('stores it and lets the Creator download it by its link', async () => {
    const response = await send('Tập 1.mp4', MP4);
    expect(response.status).toBe(201);
    const film = (await response.json()) as { id: string; fileName: string };

    const file = await download(new Request('http://studio.test/x'), params({ id: film.id, name: encodeURIComponent('Tập 1.mp4') }));
    expect(file.status).toBe(200);
    expect(file.headers.get('Content-Type')).toBe('video/mp4');
    expect(file.headers.get('Content-Disposition')).toContain("filename*=UTF-8''T%E1%BA%ADp%201.mp4");
    expect(Buffer.from(await file.arrayBuffer()).equals(MP4)).toBe(true);
    expect((await download(new Request('http://studio.test/x'), params({ id: film.id, name: 'other.mp4' }))).status).toBe(404);
  });

  it('refuses a file that is not an MP4/MOV video, or comes without a name', async () => {
    expect((await send('phim.mkv', MP4)).status).toBe(400);
    expect((await send('phim.mp4', Buffer.from('hello world, no video'))).status).toBe(400);
    expect((await upload(new Request('http://studio.test/api/films', { method: 'POST', body: new Uint8Array(MP4) }))).status).toBe(400);
  });

  it('drops a video so its link stops working', async () => {
    const film = (await (await send('a.mp4', MP4)).json()) as { id: string };
    expect((await remove(new Request('http://studio.test/x'), params({ id: film.id }))).status).toBe(204);
    expect((await remove(new Request('http://studio.test/x'), params({ id: film.id }))).status).toBe(404);
    expect((await download(new Request('http://studio.test/x'), params({ id: film.id, name: 'a.mp4' }))).status).toBe(404);
  });
});

describe('POST /api/messages/:id/reply with uploaded videos', () => {
  it('mails a link per episode and logs which files went out', async () => {
    const film = (await (await send('tap-1.mp4', MP4)).json()) as { id: string };
    const response = await reply(
      json({ source: 'upload', version: 'v1', label: 'Bản giao đầu', note: '', episodes: [{ episode: 1, filmId: film.id }] }),
      params({ id: '1001' }),
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ source: 'upload', version: 'v1', episodeCount: 1, aiCinema: { status: 'notified' } });
    const [record] = await readSent(dataDir);
    expect(record.files).toEqual([{ episode: 1, fileName: 'tap-1.mp4', sizeBytes: MP4.length }]);
  });

  it('refuses an episode outside the order, a missing video, a bad version or an empty list', async () => {
    const film = (await (await send('tap-1.mp4', MP4)).json()) as { id: string };
    const ask = (body: Record<string, unknown>) =>
      reply(json({ source: 'upload', version: 'v1', label: 'Bản giao đầu', note: '', ...body }), params({ id: '1001' }));
    expect((await ask({ episodes: [{ episode: 99, filmId: film.id }] })).status).toBe(400);
    expect((await ask({ episodes: [{ episode: 1, filmId: '00000000-0000-4000-8000-000000000000' }] })).status).toBe(400);
    expect((await ask({ episodes: [] })).status).toBe(400);
    expect((await ask({ version: 'final', episodes: [{ episode: 1, filmId: film.id }] })).status).toBe(400);
    expect((await ask({ episodes: [{ episode: 1 }] })).status).toBe(400);
    expect(await readSent(dataDir)).toEqual([]);
  });
});
