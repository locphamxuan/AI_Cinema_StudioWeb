import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FilmRejected, filmStream, filmUrl, readFilm, removeFilm, safeFileName, saveFilm } from '@/lib/films';
import { composeUploadMail, partName } from '@/lib/upload-mail';
import type { Brief } from '@/lib/mail/brief-parser';
import { MP4, streamOf } from './video-fixture';

let dataDir: string;
beforeEach(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), 'studio-films-'));
});
afterEach(() => rm(dataDir, { recursive: true, force: true }));

describe('uploaded films', () => {
  it('stores an MP4 under an unguessable id and serves it back', async () => {
    const film = await saveFilm(dataDir, 'Tập 1 - Mưa.mp4', streamOf(MP4));
    expect(film).toMatchObject({ fileName: 'Tập 1 - Mưa.mp4', contentType: 'video/mp4', sizeBytes: MP4.length });
    expect(await readFilm(dataDir, film.id)).toEqual(film);
    const served = Buffer.from(await new Response(filmStream(dataDir, film)).arrayBuffer());
    expect(served.equals(MP4)).toBe(true);
  });

  it('takes only MP4 and MOV whose content looks like one', async () => {
    await expect(saveFilm(dataDir, 'phim.avi', streamOf(MP4))).rejects.toBeInstanceOf(FilmRejected);
    await expect(saveFilm(dataDir, 'phim.mp4', streamOf(Buffer.from('not a video at all')))).rejects.toThrow('không phải video');
    await expect(saveFilm(dataDir, 'phim.mov', streamOf(Buffer.alloc(0)))).rejects.toThrow('rỗng');
    expect((await saveFilm(dataDir, 'PHIM.MOV', streamOf(MP4))).contentType).toBe('video/quicktime');
  });

  it('keeps a file name free of folders and reserved characters', () => {
    expect(safeFileName('../../etc/passwd.mp4')).toBe('passwd.mp4');
    expect(safeFileName('C:\\Users\\a\\Phim: "hay"?.mp4')).toBe('Phim_ _hay__.mp4');
    expect(safeFileName('.mp4')).toBe('.mp4');
  });

  it('forgets a removed film and ignores ids that are not its own', async () => {
    const film = await saveFilm(dataDir, 'a.mp4', streamOf(MP4));
    expect(await removeFilm(dataDir, film.id)).toBe(true);
    expect(await readFilm(dataDir, film.id)).toBeNull();
    expect(await readFilm(dataDir, '../../secret')).toBeNull();
    expect(await removeFilm(dataDir, film.id)).toBe(false);
  });

  it('links the film on the public address of the site', () => {
    expect(filmUrl('https://studio.example/', { id: 'abc', fileName: 'Tập 1.mp4' })).toBe(
      'https://studio.example/films/abc/T%E1%BA%ADp%201.mp4',
    );
  });
});

describe('the mail of uploaded films', () => {
  const brief = {
    messageId: '1001',
    movieTitle: 'Mưa Sài Gòn',
    scope: 'Mùa 2',
    episodeCount: 3,
    contactName: 'Creator Một',
    contactEmail: 'creator01@aicinema.com',
  } as Brief;
  const film = (id: string, fileName: string) => ({ id, fileName, contentType: 'video/mp4', sizeBytes: 2048, uploadedAt: '' });

  it('names a one-episode order as the whole part', () => {
    expect(partName({ scope: 'Mùa 2', episodeCount: 1 }, 1)).toBe('Phần 2 (trọn bộ)');
    expect(partName({ scope: 'Toàn bộ dự án', episodeCount: 1 }, 1)).toBe('Phim trọn bộ');
    expect(partName({ scope: 'Mùa 2', episodeCount: 3 }, 2)).toBe('Tập 2');
  });

  it('lists a link per episode in order, says what is still to come and carries the note', () => {
    const mail = composeUploadMail({
      brief,
      delivery: {
        version: 'v1',
        label: 'Bản giao đầu',
        note: 'Tập 3 gửi sau hai ngày.',
        episodes: [
          { episode: 2, film: film('b', 'tap-2.mp4') },
          { episode: 1, film: film('a', 'tap-1.mp4') },
        ],
      },
      studioName: 'Studio Ánh Trăng',
      publicUrl: 'https://studio.example',
    });
    expect(mail.to).toBe('creator01@aicinema.com');
    expect(mail.subject).toBe('[Studio] Giao phim "Mưa Sài Gòn" (Mùa 2) - Bản giao đầu v1');
    expect(mail.text.indexOf('Tập 1 - tap-1.mp4')).toBeLessThan(mail.text.indexOf('Tập 2 - tap-2.mp4'));
    expect(mail.text).toContain('Tải về: https://studio.example/films/a/tap-1.mp4');
    expect(mail.text).toContain('2/3 tập');
    expect(mail.text).toContain('Còn 1 tập');
    expect(mail.text).toContain('Tập 3 gửi sau hai ngày.');
  });
});
