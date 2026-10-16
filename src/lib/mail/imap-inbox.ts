import { ImapFlow } from 'imapflow';
import { simpleParser, type ParsedMail } from 'mailparser';
import type { ImapConfig } from '../config';
import type { AttachmentFile, InboxMessage, MailAttachment, MailInbox, MailMessage } from './types';

/** How many of the newest mails of the mailbox are looked at; hand-off mails are few and recent. */
const RECENT = 100;

/** The part of imapflow's client this inbox uses, so tests can stand in for a mail server. */
export interface ImapClientLike {
  connect(): Promise<void>;
  logout(): Promise<void>;
  getMailboxLock(mailbox: string): Promise<{ release(): void }>;
  mailbox: false | { exists: number };
  fetch(
    range: string,
    query: { uid: true; envelope: true; internalDate: true },
  ): AsyncIterable<{
    uid: number;
    envelope?: { subject?: string; from?: { name?: string; address?: string }[]; to?: { address?: string }[] };
    internalDate?: Date | string;
  }>;
  fetchOne(uid: string, query: { source: true }, options: { uid: true }): Promise<false | { source?: Buffer }>;
}

export type ImapClientFactory = (config: ImapConfig) => ImapClientLike;

const createClient: ImapClientFactory = (config) =>
  new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.password },
    logger: false,
  }) as unknown as ImapClientLike;

export class ImapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImapError';
  }
}

const toAttachment = (file: ParsedMail['attachments'][number], index: number): MailAttachment => ({
  id: String(index),
  fileName: file.filename ?? `tep-dinh-kem-${index + 1}`,
  contentType: file.contentType,
  sizeBytes: file.size,
});

/** The studio's mailbox read over IMAP (Gmail: an app password, IMAP turned on). Mail ids are IMAP UIDs. */
export class ImapInbox implements MailInbox {
  constructor(
    private readonly config: ImapConfig,
    private readonly factory: ImapClientFactory = createClient,
  ) {}

  async list(): Promise<InboxMessage[]> {
    return this.withMailbox(async (client) => {
      const total = client.mailbox ? client.mailbox.exists : 0;
      if (total === 0) return [];
      const messages: InboxMessage[] = [];
      for await (const item of client.fetch(`${Math.max(1, total - RECENT + 1)}:*`, {
        uid: true,
        envelope: true,
        internalDate: true,
      })) {
        const from = item.envelope?.from?.[0];
        messages.push({
          id: String(item.uid),
          subject: item.envelope?.subject ?? '',
          fromName: from?.name ?? '',
          fromEmail: (from?.address ?? '').toLowerCase(),
          toEmail: (item.envelope?.to?.[0]?.address ?? '').toLowerCase(),
          receivedAt: new Date(item.internalDate ?? Date.now()).toISOString(),
        });
      }
      return messages;
    });
  }

  async get(id: string): Promise<MailMessage | null> {
    const parsed = await this.parsed(id);
    if (!parsed) return null;
    const { mail, summary } = parsed;
    return { ...summary, text: mail.text ?? '', attachments: mail.attachments.map(toAttachment) };
  }

  async attachment(messageId: string, attachmentId: string): Promise<AttachmentFile | null> {
    const file = (await this.parsed(messageId))?.mail.attachments[Number(attachmentId)];
    if (!file) return null;
    return {
      fileName: file.filename ?? `tep-dinh-kem-${attachmentId}`,
      contentType: file.contentType || 'application/octet-stream',
      content: file.content,
    };
  }

  private async parsed(id: string): Promise<{ mail: ParsedMail; summary: InboxMessage } | null> {
    if (!/^\d+$/.test(id)) return null;
    return this.withMailbox(async (client) => {
      const found = await client.fetchOne(id, { source: true }, { uid: true });
      if (!found || !found.source) return null;
      const mail = await simpleParser(found.source);
      const from = mail.from?.value[0];
      const to = Array.isArray(mail.to) ? mail.to[0] : mail.to;
      return {
        mail,
        summary: {
          id,
          subject: mail.subject ?? '',
          fromName: from?.name ?? '',
          fromEmail: (from?.address ?? '').toLowerCase(),
          toEmail: (to?.value[0]?.address ?? '').toLowerCase(),
          receivedAt: (mail.date ?? new Date()).toISOString(),
        },
      };
    });
  }

  /** Opens the mailbox for one piece of work and always lets go of the connection. */
  private async withMailbox<T>(work: (client: ImapClientLike) => Promise<T>): Promise<T> {
    const client = this.factory(this.config);
    try {
      await client.connect();
    } catch (error) {
      throw new ImapError(
        `Không đăng nhập được hộp thư IMAP (${this.config.host}): kiểm tra IMAP_USER, IMAP_PASSWORD (mật khẩu ứng dụng Gmail) và đã bật IMAP. ${
          error instanceof Error ? error.message : ''
        }`.trim(),
      );
    }
    try {
      const lock = await client.getMailboxLock(this.config.mailbox);
      try {
        return await work(client);
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch(() => undefined);
    }
  }
}
