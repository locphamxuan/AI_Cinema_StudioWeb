import type { MailtrapConfig } from '../config';
import type { AttachmentFile, InboxMessage, MailAttachment, MailInbox, MailMessage } from './types';

const API = 'https://mailtrap.io';

/** The fields of Mailtrap's "messages" API (Email Testing) that the studio reads. */
interface ApiMessage {
  id: number;
  subject: string;
  sent_at: string;
  from_email: string;
  from_name: string;
  to_email: string;
  created_at: string;
}

interface ApiAttachment {
  id: number;
  filename: string;
  content_type: string;
  attachment_size: number;
  download_path: string;
}

export class MailError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'MailError';
  }
}

const toInbox = (message: ApiMessage): InboxMessage => ({
  id: String(message.id),
  subject: message.subject ?? '',
  fromName: message.from_name ?? '',
  fromEmail: message.from_email ?? '',
  toEmail: (message.to_email ?? '').toLowerCase(),
  receivedAt: message.sent_at || message.created_at,
});

const toAttachment = (file: ApiAttachment): MailAttachment => ({
  id: String(file.id),
  fileName: file.filename,
  contentType: file.content_type,
  sizeBytes: file.attachment_size,
});

/** The studio's mailbox on a Mailtrap sandbox inbox, read through Mailtrap's API with a token kept on the server. */
export class MailtrapInbox implements MailInbox {
  constructor(
    private readonly config: MailtrapConfig,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async list(): Promise<InboxMessage[]> {
    const messages = await this.json<ApiMessage[]>('/messages');
    return messages.map(toInbox);
  }

  async get(id: string): Promise<MailMessage | null> {
    const found = await this.request(`/messages/${encodeURIComponent(id)}`, { allowMissing: true });
    if (!found) return null;
    const message = (await found.json()) as ApiMessage;
    const [text, attachments] = await Promise.all([
      this.request(`/messages/${encodeURIComponent(id)}/body.txt`).then((res) => res?.text() ?? ''),
      this.attachments(id),
    ]);
    return { ...toInbox(message), text, attachments: attachments.map(toAttachment) };
  }

  async attachment(messageId: string, attachmentId: string): Promise<AttachmentFile | null> {
    const file = (await this.attachments(messageId)).find((candidate) => String(candidate.id) === attachmentId);
    if (!file) return null;
    const response = await this.fetcher(`${API}${file.download_path}`, { headers: this.headers() });
    if (!response.ok) throw new MailError(`Mailtrap không trả được tệp đính kèm (${response.status})`, response.status);
    return {
      fileName: file.filename,
      contentType: file.content_type || 'application/octet-stream',
      content: Buffer.from(await response.arrayBuffer()),
    };
  }

  private attachments(messageId: string): Promise<ApiAttachment[]> {
    return this.json<ApiAttachment[]>(`/messages/${encodeURIComponent(messageId)}/attachments`);
  }

  private headers(): Record<string, string> {
    return { 'Api-Token': this.config.apiToken, Accept: 'application/json' };
  }

  private async json<T>(path: string): Promise<T> {
    const response = await this.request(path);
    return (await response?.json()) as T;
  }

  /** `allowMissing` answers null for a 404 instead of failing. */
  private async request(path: string, options: { allowMissing?: boolean } = {}): Promise<Response | null> {
    const { accountId, inboxId } = this.config;
    const response = await this.fetcher(`${API}/api/accounts/${accountId}/inboxes/${inboxId}${path}`, {
      headers: this.headers(),
      cache: 'no-store',
    });
    if (response.status === 404 && options.allowMissing) return null;
    if (response.status === 401 || response.status === 403) {
      throw new MailError('Mailtrap từ chối token: kiểm tra MAILTRAP_API_TOKEN và quyền truy cập inbox.', response.status);
    }
    if (!response.ok) throw new MailError(`Mailtrap trả lỗi ${response.status}.`, response.status);
    return response;
  }
}
