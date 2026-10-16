import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST as access } from '@/app/api/access/route';
import { GET as attachment } from '@/app/api/messages/[id]/attachments/[attachmentId]/route';
import { POST as reply } from '@/app/api/messages/[id]/reply/route';
import { ACCESS_COOKIE, accessToken } from '@/lib/access';
import { readSent } from '@/lib/sent-log';

const cookie = vi.hoisted(() => ({ value: undefined as string | undefined }));

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (name === 'studio_access' && cookie.value ? { name, value: cookie.value } : undefined) }),
}));

let dataDir: string;

beforeEach(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), 'studio-web-routes-'));
  vi.stubEnv('MAIL_SOURCE', 'fixtures');
  vi.stubEnv('DATA_DIR', dataDir);
  vi.stubEnv('STUDIO_ACCESS_CODE', '');
  cookie.value = undefined;
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(dataDir, { recursive: true, force: true });
});

const post = (body: unknown) =>
  new Request('http://studio.test/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const ids = (id: string, attachmentId = '') => ({ params: Promise.resolve({ id, attachmentId }) });

describe('POST /api/messages/:id/reply', () => {
  it('sends the chosen version and answers with the record', async () => {
    const response = await reply(post({ version: 'v1' }), ids('1001'));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ messageId: '1001', version: 'v1', to: 'creator01@aicinema.com' });
    expect(await readSent(dataDir)).toHaveLength(1);
  });

  it('sends to the To and CC the studio wrote, and records the CC', async () => {
    const compose = { to: 'phu@aicinema.com', cc: ['creator01@aicinema.com'], subject: 'Tập 2 của anh Phụ' };
    const response = await reply(post({ version: 'v1', compose }), ids('1001'));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ to: 'phu@aicinema.com', cc: ['creator01@aicinema.com'], subject: 'Tập 2 của anh Phụ' });
  });

  it('refuses an envelope with a wrong address', async () => {
    const response = await reply(post({ version: 'v1', compose: { to: 'nope', cc: [], subject: 'S' } }), ids('1001'));
    expect(response.status).toBe(400);
    expect(((await response.json()) as { error: string }).error).toContain('Tới');
  });

  it('asks for a version, and refuses one that does not exist', async () => {
    expect((await reply(post({}), ids('1001'))).status).toBe(400);
    expect((await reply(post({ version: 3 }), ids('1001'))).status).toBe(400);
    const unknown = await reply(post({ version: 'v9' }), ids('1001'));
    expect(unknown.status).toBe(400);
    expect(((await unknown.json()) as { error: string }).error).toContain('v9');
    expect((await reply(post({ version: 'v1' }), ids('nope'))).status).toBe(404);
  });

  it('is closed to a visitor without the access code', async () => {
    vi.stubEnv('STUDIO_ACCESS_CODE', 's3cret');
    expect((await reply(post({ version: 'v1' }), ids('1001'))).status).toBe(401);
    cookie.value = accessToken('s3cret');
    expect((await reply(post({ version: 'v1' }), ids('1001'))).status).toBe(201);
  });
});

describe('GET /api/messages/:id/attachments/:attachmentId', () => {
  it('serves the brief PDF as a download', async () => {
    const response = await attachment(new Request('http://studio.test/x'), ids('1001', '1001-brief'));
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
    expect(response.headers.get('Content-Disposition')).toContain('brief-1001.pdf');
    expect(Buffer.from(await response.arrayBuffer()).subarray(0, 4).toString()).toBe('%PDF');
  });

  it('says so when the file is not there', async () => {
    expect((await attachment(new Request('http://studio.test/x'), ids('1001', 'nope'))).status).toBe(404);
  });
});

describe('POST /api/access', () => {
  it('lets anyone in when no code is set', async () => {
    expect((await access(post({}))).status).toBe(200);
  });

  it('sets an HttpOnly cookie holding a hash when the code is right, and refuses a wrong one', async () => {
    vi.stubEnv('STUDIO_ACCESS_CODE', 's3cret');
    const wrong = await access(post({ code: 'nope' }));
    expect(wrong.status).toBe(401);
    expect(wrong.headers.get('Set-Cookie')).toBeNull();

    const right = await access(post({ code: 's3cret' }));
    expect(right.status).toBe(200);
    const setCookie = right.headers.get('Set-Cookie') ?? '';
    expect(setCookie).toContain(`${ACCESS_COOKIE}=${accessToken('s3cret')}`);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).not.toContain('s3cret;');
  });
});
