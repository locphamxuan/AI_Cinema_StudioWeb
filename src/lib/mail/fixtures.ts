import type { AttachmentFile, InboxMessage, MailInbox, MailMessage } from './types';

/** A tiny but valid-looking PDF: the demo only needs something to download. */
const BRIEF_PDF = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n');

function brief(id: string, title: string, scope: string, episodes: number, tokens: number, receivedAt: string): MailMessage {
  return {
    id,
    subject: `[AI Cinema] Đơn đặt hàng sản xuất phim "${title}" (${scope})`,
    fromName: 'AI Cinema',
    fromEmail: 'no-reply@aicinema.local',
    toEmail: 'contact@anhtrang.studio',
    receivedAt,
    text: [
      'Kính gửi Studio Ánh Trăng,',
      '',
      `AI Cinema gửi đơn đặt hàng sản xuất phim "${title}" (${scope}) gồm ${episodes} tập.`,
      `Phí sản xuất: ${tokens} Token (= ${tokens * 1000} VND).`,
      'Chi tiết từng tập và hạn giao nằm trong brief PDF đính kèm, kèm kịch bản và tài liệu tham khảo.',
      'Khi hoàn tất, vui lòng gửi phim đã soạn sẵn qua email cho đầu mối bên dưới.',
      '',
      'Đầu mối: Nguyễn Thị Creator - creator01@aicinema.com',
    ].join('\n'),
    attachments: [
      { id: `${id}-brief`, fileName: `brief-${id}.pdf`, contentType: 'application/pdf', sizeBytes: BRIEF_PDF.length },
    ],
  };
}

export const FIXTURE_MESSAGES: MailMessage[] = [
  brief('1001', 'Căn Hộ Số 13', 'Toàn bộ dự án', 3, 15000, '2026-10-14T03:00:00.000Z'),
  brief('1002', 'Một Dự Án Chưa Có Bản Soạn Sẵn', 'Mùa 1', 2, 8000, '2026-10-14T04:30:00.000Z'),
];

/** Canned briefs for a demo or a test without any network. */
export class FixtureInbox implements MailInbox {
  constructor(private readonly messages: MailMessage[] = FIXTURE_MESSAGES) {}

  async list(): Promise<InboxMessage[]> {
    return this.messages.map(({ id, subject, fromName, fromEmail, toEmail, receivedAt }) => ({
      id,
      subject,
      fromName,
      fromEmail,
      toEmail,
      receivedAt,
    }));
  }

  async get(id: string): Promise<MailMessage | null> {
    return this.messages.find((message) => message.id === id) ?? null;
  }

  async attachment(messageId: string, attachmentId: string): Promise<AttachmentFile | null> {
    const file = this.messages.find((m) => m.id === messageId)?.attachments.find((a) => a.id === attachmentId);
    return file ? { fileName: file.fileName, contentType: file.contentType, content: BRIEF_PDF } : null;
  }
}
