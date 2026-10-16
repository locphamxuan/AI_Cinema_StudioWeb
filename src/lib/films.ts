import { randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';

/**
 * Videos the studio uploads from its own machine to hand back. They are written straight to disk as they arrive
 * (never held in memory), and the Creator downloads them through a link that names an unguessable id.
 */

export interface StoredFilm {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
}

/** AI Cinema takes MP4 and MOV uploads as Submissions, so the studio sends those. */
const TYPES: Record<string, string> = { '.mp4': 'video/mp4', '.mov': 'video/quicktime' };
export const FILM_EXTENSIONS = Object.keys(TYPES);
export const MAX_FILM_BYTES = 5 * 1024 ** 3;
/** MP4 and MOV both start with an ISO box whose type sits at bytes 4-8. */
const BOX_TYPES = new Set(['ftyp', 'moov', 'mdat', 'wide', 'free', 'skip', 'pnot']);
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const META = 'film.json';

/** Thrown for a file the studio may not upload; the message is shown as is. */
export class FilmRejected extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'FilmRejected';
  }
}

/** The file name without folders, control or reserved characters, kept short. */
export function safeFileName(name: string): string {
  const base = path.basename(name.replace(/\\/g, '/'));
  const cleaned = base.replace(/[\p{Cc}<>:"/\\|?*]/gu, '_').replace(/\s+/g, ' ').trim();
  const ext = path.extname(cleaned).toLowerCase();
  const stem = cleaned.slice(0, cleaned.length - ext.length).slice(0, 150) || 'phim';
  return `${stem}${ext}`;
}

const filmsDir = (dataDir: string) => path.join(dataDir, 'films');
const folderOf = (dataDir: string, id: string) => path.join(filmsDir(dataDir), id);

/** Counts the bytes, refuses too many, and checks the first ones look like a video before anything piles up. */
function guard(): Transform {
  let seen = 0;
  let head = Buffer.alloc(0);
  return new Transform({
    transform(chunk: Buffer, _encoding, done) {
      seen += chunk.length;
      if (seen > MAX_FILM_BYTES) return done(new FilmRejected(413, 'Tệp quá lớn: tối đa 5 GB mỗi tập.'));
      if (head.length < 8) {
        head = Buffer.concat([head, chunk]).subarray(0, 8);
        if (head.length >= 8 && !BOX_TYPES.has(head.subarray(4, 8).toString('latin1'))) {
          return done(new FilmRejected(400, 'Nội dung tệp không phải video MP4/MOV.'));
        }
      }
      done(null, chunk);
    },
    flush(done) {
      if (head.length < 8) return done(new FilmRejected(400, 'Tệp rỗng hoặc không phải video MP4/MOV.'));
      done();
    },
  });
}

export async function saveFilm(dataDir: string, name: string, body: WebReadableStream<Uint8Array> | null): Promise<StoredFilm> {
  const fileName = safeFileName(name);
  const contentType = TYPES[path.extname(fileName).toLowerCase()];
  if (!contentType) throw new FilmRejected(400, `Chỉ nhận video ${FILM_EXTENSIONS.join(', ')} (AI Cinema nhận MP4/MOV).`);
  if (!body) throw new FilmRejected(400, 'Không có nội dung tệp.');

  const id = randomUUID();
  const folder = folderOf(dataDir, id);
  await mkdir(folder, { recursive: true });
  try {
    await pipeline(Readable.fromWeb(body), guard(), createWriteStream(path.join(folder, fileName)));
  } catch (error) {
    await rm(folder, { recursive: true, force: true });
    throw error;
  }
  const { size } = await stat(path.join(folder, fileName));
  const film: StoredFilm = { id, fileName, contentType, sizeBytes: size, uploadedAt: new Date().toISOString() };
  await writeFile(path.join(folder, META), JSON.stringify(film), 'utf8');
  return film;
}

export async function readFilm(dataDir: string, id: string): Promise<StoredFilm | null> {
  if (!ID.test(id)) return null;
  try {
    return JSON.parse(await readFile(path.join(folderOf(dataDir, id), META), 'utf8')) as StoredFilm;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

/** The file as a web stream, for the download route. */
export function filmStream(dataDir: string, film: StoredFilm): ReadableStream<Uint8Array> {
  const file = createReadStream(path.join(folderOf(dataDir, film.id), film.fileName));
  return Readable.toWeb(file) as unknown as ReadableStream<Uint8Array>;
}

export async function removeFilm(dataDir: string, id: string): Promise<boolean> {
  if (!(await readFilm(dataDir, id))) return false;
  await rm(folderOf(dataDir, id), { recursive: true, force: true });
  return true;
}

/** Where the Creator downloads the film: on this site, so it must be reachable from the Creator's machine. */
export function filmUrl(publicUrl: string, film: Pick<StoredFilm, 'id' | 'fileName'>): string {
  return `${publicUrl.replace(/\/+$/, '')}/films/${film.id}/${encodeURIComponent(film.fileName)}`;
}
