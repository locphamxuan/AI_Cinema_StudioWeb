import { createTransport } from 'nodemailer';
import type { SmtpConfig } from '../config';
import type { MailSender, OutgoingMail } from './types';

/** Sends the studio's replies over SMTP (Mailtrap's sandbox while demoing). */
export class SmtpSender implements MailSender {
  constructor(
    private readonly smtp: SmtpConfig,
    private readonly from: { name: string; address: string },
  ) {}

  async send(mail: OutgoingMail): Promise<void> {
    const { host, port, secure, user, password } = this.smtp;
    const transport = createTransport({ host, port, secure, auth: user ? { user, pass: password } : undefined });
    await transport.sendMail({
      from: { name: this.from.name, address: this.from.address },
      to: mail.to,
      cc: mail.cc?.length ? mail.cc : undefined,
      subject: mail.subject,
      text: mail.text,
      attachments: mail.attachments,
    });
  }
}

/** Keeps what was sent instead of sending it: for the fixtures source and for tests. */
export class MemorySender implements MailSender {
  readonly sent: OutgoingMail[] = [];

  async send(mail: OutgoingMail): Promise<void> {
    this.sent.push(mail);
  }
}
