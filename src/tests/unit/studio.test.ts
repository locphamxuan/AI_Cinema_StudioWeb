import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ACCESS_COOKIE, accessToken, codeMatches, hasAccess } from '@/lib/access';
import { getConfig, missingSettings } from '@/lib/config';
import { MemorySender } from '@/lib/mail/smtp-sender';
import { readSent } from '@/lib/sent-log';
import { createServices, getBrief, listBriefs, replyWithFilm, StudioError } from '@/lib/studio';

let dataDir: string;

beforeEach(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), 'studio-web-'));
});
afterEach(() => rm(dataDir, { recursive: true, force: true }));

const fixtureServices = (extra: Record<string, string> = {}) =>
  createServices(getConfig({ MAIL_SOURCE: 'fixtures', DATA_DIR: dataDir, ...extra }));

describe('settings', () => {
  it('reads the environment with safe defaults', () => {
    const config = getConfig({ STUDIO_EMAILS: ' A@x.vn, b@x.vn ,', SMTP_PORT: 'oops' });
    expect(config).toMatchObject({ source: 'mailtrap', studioEmails: ['a@x.vn', 'b@x.vn'], accessCode: '', dataDir: '.data' });
    expect(config.smtp).toMatchObject({ host: 'sandbox.smtp.mailtrap.io', port: 587, secure: false });
  });

  it('says what is missing before the mailbox can be read', () => {
    expect(missingSettings(getConfig({}))).toEqual(['MAILTRAP_API_TOKEN', 'MAILTRAP_ACCOUNT_ID', 'MAILTRAP_INBOX_ID']);
    expect(missingSettings(getConfig({ MAIL_SOURCE: 'fixtures' }))).toEqual([]);
  });
});

describe('inbox of the studio', () => {
  it('lists the hand-off mails, newest first, and leaves out mail for other addresses', async () => {
    const rows = await listBriefs(fixtureServices());
    expect(rows.map((row) => row.brief.messageId)).toEqual(['1002', '1001']);
    expect(await listBriefs(fixtureServices({ STUDIO_EMAILS: 'other@studio.vn' }))).toEqual([]);
    expect(await listBriefs(fixtureServices({ STUDIO_EMAILS: 'Contact@AnhTrang.studio' }))).toHaveLength(2);
  });

  it('refuses to read a Mailtrap inbox that is not configured', async () => {
    const services = createServices(getConfig({ DATA_DIR: dataDir }));
    await expect(listBriefs(services)).rejects.toMatchObject({ status: 503, message: expect.stringContaining('MAILTRAP_API_TOKEN') });
  });

  it('opens one brief and says so when there is none', async () => {
    const services = fixtureServices();
    expect((await getBrief(services, '1001')).brief.movieTitle).toBe('Căn Hộ Số 13');
    await expect(getBrief(services, 'nope')).rejects.toMatchObject({ status: 404 });
  });
});

describe('handing the film back', () => {
  it('emails the prepared version to the Creator and remembers it', async () => {
    const services = fixtureServices();
    const record = await replyWithFilm(services, '1001', 'v1');
    const sent = (services.sender as MemorySender).sent;

    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: 'creator01@aicinema.com' });
    expect(sent[0].subject).toContain('Căn Hộ Số 13');
    expect(sent[0].attachments[0].filename).toBe('can-ho-so-13.txt');
    expect(record).toMatchObject({ messageId: '1001', version: 'v1', to: 'creator01@aicinema.com', episodeCount: 3 });
    expect(await readSent(dataDir)).toEqual([record]);

    const [row] = (await listBriefs(services)).filter((r) => r.brief.messageId === '1001');
    expect(row.sent).toEqual([record]);
  });

  it('sends the fixed version later, and keeps every send in the log', async () => {
    const services = fixtureServices();
    await replyWithFilm(services, '1001', 'v1');
    await replyWithFilm(services, '1001', 'v2');
    expect((await readSent(dataDir)).map((r) => r.version)).toEqual(['v2', 'v1']);
  });

  it('uses the general films, fitted to the episodes ordered, for a title it has none for', async () => {
    const services = fixtureServices();
    const record = await replyWithFilm(services, '1002', 'v1');
    expect(record.episodeCount).toBe(2);
    expect((services.sender as MemorySender).sent[0].text).toContain('Tập 2');
  });

  it('refuses a version it does not have, and an order that is not there', async () => {
    const services = fixtureServices();
    await expect(replyWithFilm(services, '1001', 'v9')).rejects.toMatchObject({ status: 400 });
    await expect(replyWithFilm(services, 'nope', 'v1')).rejects.toBeInstanceOf(StudioError);
    expect(await readSent(dataDir)).toEqual([]);
  });

  it('reports a failed send and records nothing', async () => {
    const services = fixtureServices();
    services.sender = { send: async () => Promise.reject(new Error('SMTP refused')) };
    await expect(replyWithFilm(services, '1001', 'v1')).rejects.toMatchObject({ status: 502, message: expect.stringContaining('SMTP refused') });
    expect(await readSent(dataDir)).toEqual([]);
  });
});

describe('access code', () => {
  it('lets everyone in when no code is set', () => {
    expect(hasAccess('', undefined)).toBe(true);
  });

  it('lets in only a visitor whose cookie proves the code, and never stores the code itself', () => {
    expect(hasAccess('s3cret', undefined)).toBe(false);
    expect(hasAccess('s3cret', 'wrong')).toBe(false);
    expect(hasAccess('s3cret', accessToken('other'))).toBe(false);
    expect(hasAccess('s3cret', accessToken('s3cret'))).toBe(true);
    expect(accessToken('s3cret')).not.toContain('s3cret');
    expect(ACCESS_COOKIE).toBe('studio_access');
  });

  it('compares a submitted code in constant time', () => {
    expect(codeMatches('s3cret', 's3cret')).toBe(true);
    expect(codeMatches('s3cret', 'S3cret')).toBe(false);
    expect(codeMatches('s3cret', '')).toBe(false);
  });
});
