import { describe, expect, it, vi } from 'vitest';
import { getConfig } from '@/lib/config';
import { ImapError, ImapInbox, type ImapClientLike } from '@/lib/mail/imap-inbox';

const CONFIG = getConfig({ IMAP_USER: 'studio@gmail.com', IMAP_PASSWORD: 'app-password' }).imap;

const RAW = [
  'From: =?UTF-8?Q?Ph=E1=BA=A1m_Creator?= <Creator@Mail.vn>',
  'To: Studio <studio@gmail.com>',
  'Subject: [AI Cinema] Don dat hang',
  'Date: Thu, 15 Oct 2026 09:00:00 +0700',
  'MIME-Version: 1.0',
  'Content-Type: multipart/mixed; boundary="b"',
  '',
  '--b',
  'Content-Type: text/plain; charset=utf-8',
  '',
  'Kinh gui Studio',
  '--b',
  'Content-Type: application/pdf; name="brief-1.pdf"',
  'Content-Disposition: attachment; filename="brief-1.pdf"',
  'Content-Transfer-Encoding: base64',
  '',
  Buffer.from('%PDF-1.4 demo').toString('base64'),
  '--b--',
  '',
].join('\r\n');

function fakeClient(overrides: Partial<ImapClientLike> = {}) {
  const release = vi.fn();
  const logout = vi.fn(async () => undefined);
  const client: ImapClientLike = {
    connect: vi.fn(async () => undefined),
    logout,
    getMailboxLock: vi.fn(async () => ({ release })),
    mailbox: { exists: 2 },
    fetch: vi.fn(async function* () {
      yield { uid: 41, envelope: { subject: 'Khac', from: [{ address: 'A@x.vn' }], to: [{ address: 'S@Gmail.com' }] }, internalDate: '2026-10-15T01:00:00.000Z' };
      yield {
        uid: 42,
        envelope: { subject: '[AI Cinema] Don dat hang', from: [{ name: 'Creator', address: 'Creator@Mail.vn' }], to: [{ address: 'studio@gmail.com' }] },
        internalDate: new Date('2026-10-15T02:00:00.000Z'),
      };
    }),
    fetchOne: vi.fn(async (uid: string) => (uid === '42' ? { source: Buffer.from(RAW) } : false)),
    ...overrides,
  };
  return { client, release, logout };
}

describe('ImapInbox', () => {
  it('lists the newest mails with lower-cased addresses and always lets go of the connection', async () => {
    const { client, release, logout } = fakeClient();
    const messages = await new ImapInbox(CONFIG, () => client).list();
    expect(messages.map((m) => m.id)).toEqual(['41', '42']);
    expect(messages[0]).toMatchObject({ toEmail: 's@gmail.com', fromEmail: 'a@x.vn', receivedAt: '2026-10-15T01:00:00.000Z' });
    expect(messages[1]).toMatchObject({ fromName: 'Creator', subject: '[AI Cinema] Don dat hang' });
    expect(release).toHaveBeenCalledOnce();
    expect(logout).toHaveBeenCalledOnce();
  });

  it('answers an empty list for an empty mailbox', async () => {
    const { client } = fakeClient({ mailbox: { exists: 0 } });
    expect(await new ImapInbox(CONFIG, () => client).list()).toEqual([]);
  });

  it('reads one mail with its text and attachments, and hands out the attachment bytes', async () => {
    const inbox = new ImapInbox(CONFIG, () => fakeClient().client);
    const message = await inbox.get('42');
    expect(message).toMatchObject({ id: '42', fromName: 'Phạm Creator', fromEmail: 'creator@mail.vn', toEmail: 'studio@gmail.com' });
    expect(message?.text.trim()).toBe('Kinh gui Studio');
    expect(message?.attachments).toEqual([{ id: '0', fileName: 'brief-1.pdf', contentType: 'application/pdf', sizeBytes: 13 }]);

    const file = await new ImapInbox(CONFIG, () => fakeClient().client).attachment('42', '0');
    expect(file?.fileName).toBe('brief-1.pdf');
    expect(file?.content.toString()).toBe('%PDF-1.4 demo');
    expect(await new ImapInbox(CONFIG, () => fakeClient().client).attachment('42', '5')).toBeNull();
  });

  it('answers null for a mail that is gone or an id that is not a UID', async () => {
    const inbox = new ImapInbox(CONFIG, () => fakeClient().client);
    expect(await inbox.get('99')).toBeNull();
    expect(await inbox.get('../etc')).toBeNull();
  });

  it('says what to check when the login is refused', async () => {
    const { client } = fakeClient({
      connect: vi.fn(async () => {
        throw new Error('Invalid credentials');
      }),
    });
    await expect(new ImapInbox(CONFIG, () => client).list()).rejects.toThrow(ImapError);
    await expect(new ImapInbox(CONFIG, () => client).list()).rejects.toThrow(/IMAP_PASSWORD/);
  });
});
