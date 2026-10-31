/** What the studio sees of its mailbox, whichever service holds the mail (Mailtrap, canned fixtures). */

export interface MailAttachment {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

export interface InboxMessage {
  id: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  /** The studio address the mail was sent to. */
  toEmail: string;
  /** ISO time. */
  receivedAt: string;
}

export interface MailMessage extends InboxMessage {
  text: string;
  attachments: MailAttachment[];
}

export interface AttachmentFile {
  fileName: string;
  contentType: string;
  content: Buffer;
}

export interface OutgoingMail {
  to: string;
  subject: string;
  text: string;
  attachments: { filename: string; content: Buffer; contentType: string }[];
}

/** Reads the studio's mailbox. */
export interface MailInbox {
  list(): Promise<InboxMessage[]>;
  get(id: string): Promise<MailMessage | null>;
  attachment(messageId: string, attachmentId: string): Promise<AttachmentFile | null>;
}

/** Sends the studio's replies. */
export interface MailSender {
  send(mail: OutgoingMail): Promise<void>;
}
