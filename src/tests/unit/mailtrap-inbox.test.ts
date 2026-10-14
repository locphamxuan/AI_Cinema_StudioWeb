import { describe, expect, it, vi } from 'vitest';
import { MailError, MailtrapInbox } from '@/lib/mail/mailtrap-inbox';

const CONFIG = { apiToken: 'secret-token', accountId: '11', inboxId: '22' };

const API_MESSAGE = {
  id: 7,
  subject: '[AI Cinema] Đơn đặt hàng sản xuất phim "A" (Mùa 1)',
  sent_at: '2026-10-14T03:00:00.000Z',
  created_at: '2026-10-14T03:00:01.000Z',
  from_email: 'no-reply@aicinema.local',
  from_name: 'AI Cinema',
  to_email: 'Contact@AnhTrang.Studio',
};
const API_FILE = { id: 5, filename: 'brief.pdf', content_type: 'application/pdf', attachment_size: 12, download_path: '/api/accounts/11/inboxes/22/messages/7/attachments/5/download' };

/** A fetch that answers by path and remembers what it was asked. */
function fakeFetch(routes: Record<string, () => Response>) {
  const calls: { url: string; token: string | undefined }[] = [];
  const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const target = String(url);
    calls.push({ url: target, token: (init?.headers as Record<string, string> | undefined)?.['Api-Token'] });
    const route = Object.keys(routes).find((path) => target.endsWith(path));
    return route ? routes[route]() : new Response('not found', { status: 404 });
  });
  return { fetcher: fetcher as unknown as typeof fetch, calls };
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('Mailtrap inbox of the studio', () => {
  it('lists messages with the sandbox token and lower-cases the studio address', async () => {
    const { fetcher, calls } = fakeFetch({ '/inboxes/22/messages': () => json([API_MESSAGE]) });
    const messages = await new MailtrapInbox(CONFIG, fetcher).list();

    expect(messages).toEqual([
      {
        id: '7',
        subject: API_MESSAGE.subject,
        fromName: 'AI Cinema',
        fromEmail: 'no-reply@aicinema.local',
        toEmail: 'contact@anhtrang.studio',
        receivedAt: '2026-10-14T03:00:00.000Z',
      },
    ]);
    expect(calls[0]).toEqual({ url: 'https://mailtrap.io/api/accounts/11/inboxes/22/messages', token: 'secret-token' });
  });

  it('reads one message with its text and attachments', async () => {
    const { fetcher } = fakeFetch({
      '/messages/7': () => json(API_MESSAGE),
      '/messages/7/body.txt': () => new Response('Kính gửi Studio,'),
      '/messages/7/attachments': () => json([API_FILE]),
    });
    const message = await new MailtrapInbox(CONFIG, fetcher).get('7');

    expect(message?.text).toBe('Kính gửi Studio,');
    expect(message?.attachments).toEqual([{ id: '5', fileName: 'brief.pdf', contentType: 'application/pdf', sizeBytes: 12 }]);
  });

  it('answers null for a message that is gone', async () => {
    const { fetcher } = fakeFetch({});
    expect(await new MailtrapInbox(CONFIG, fetcher).get('404')).toBeNull();
  });

  it('downloads an attachment through the path Mailtrap gave', async () => {
    const { fetcher, calls } = fakeFetch({
      '/messages/7/attachments': () => json([API_FILE]),
      '/attachments/5/download': () => new Response(Buffer.from('%PDF')),
    });
    const inbox = new MailtrapInbox(CONFIG, fetcher);
    const file = await inbox.attachment('7', '5');

    expect(file).toMatchObject({ fileName: 'brief.pdf', contentType: 'application/pdf' });
    expect(file?.content.toString()).toBe('%PDF');
    expect(calls.at(-1)?.url).toBe(`https://mailtrap.io${API_FILE.download_path}`);
    expect(await inbox.attachment('7', '999')).toBeNull();
  });

  it('tells the studio when the token is refused or Mailtrap fails', async () => {
    const refused = new MailtrapInbox(CONFIG, fakeFetch({ '/messages': () => new Response('', { status: 401 }) }).fetcher);
    await expect(refused.list()).rejects.toThrow('MAILTRAP_API_TOKEN');
    const broken = new MailtrapInbox(CONFIG, fakeFetch({ '/messages': () => new Response('', { status: 500 }) }).fetcher);
    await expect(broken.list()).rejects.toBeInstanceOf(MailError);
  });
});
