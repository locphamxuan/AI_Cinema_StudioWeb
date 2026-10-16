/** Settings read from the environment, on the server only. Read on every call so tests can change them. */

/** imap = the studio's own mailbox (Gmail), mailtrap = a Mailtrap sandbox inbox, fixtures = canned briefs. */
export type MailSource = 'imap' | 'mailtrap' | 'fixtures';

export interface ImapConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  mailbox: string;
}

export interface MailtrapConfig {
  apiToken: string;
  accountId: string;
  inboxId: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
}

/** Where the studio tells AI Cinema about the films it mails; both empty = nobody is told. */
export interface AiCinemaConfig {
  apiUrl: string;
  token: string;
}

export interface StudioConfig {
  source: MailSource;
  aiCinema: AiCinemaConfig;
  mailtrap: MailtrapConfig;
  imap: ImapConfig;
  /** Lower-cased studio addresses whose mail is shown; empty = every hand-off mail of the inbox. */
  studioEmails: string[];
  smtp: SmtpConfig;
  fromName: string;
  fromAddress: string;
  accessCode: string;
  dataDir: string;
  /** This site's address as the Creator reaches it: uploaded films are downloaded from here. */
  publicUrl: string;
}

const text = (value: string | undefined, fallback = '') => value?.trim() || fallback;

type Env = Record<string, string | undefined>;

export function getConfig(env: Env = process.env): StudioConfig {
  return {
    source: env.MAIL_SOURCE === 'fixtures' || env.MAIL_SOURCE === 'mailtrap' ? env.MAIL_SOURCE : 'imap',
    imap: {
      host: text(env.IMAP_HOST, 'imap.gmail.com'),
      port: Number(env.IMAP_PORT) || 993,
      secure: env.IMAP_SECURE !== 'false',
      user: text(env.IMAP_USER),
      password: text(env.IMAP_PASSWORD),
      mailbox: text(env.IMAP_MAILBOX, 'INBOX'),
    },
    aiCinema: { apiUrl: text(env.AI_CINEMA_API_URL), token: text(env.STUDIO_WEBHOOK_TOKEN) },
    mailtrap: {
      apiToken: text(env.MAILTRAP_API_TOKEN),
      accountId: text(env.MAILTRAP_ACCOUNT_ID),
      inboxId: text(env.MAILTRAP_INBOX_ID),
    },
    studioEmails: text(env.STUDIO_EMAILS)
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
    smtp: {
      host: text(env.SMTP_HOST, 'sandbox.smtp.mailtrap.io'),
      port: Number(env.SMTP_PORT) || 587,
      secure: env.SMTP_SECURE === 'true',
      user: text(env.SMTP_USER),
      password: text(env.SMTP_PASSWORD),
    },
    fromName: text(env.MAIL_FROM_NAME, 'Studio đối tác'),
    fromAddress: text(env.MAIL_FROM_ADDRESS, 'studio@aicinema-partner.local'),
    accessCode: text(env.STUDIO_ACCESS_CODE),
    dataDir: text(env.DATA_DIR, '.data'),
    publicUrl: text(env.PUBLIC_BASE_URL, 'http://localhost:3100'),
  };
}

/** What is missing before the mailbox can be read; empty when ready. */
export function missingSettings(config: StudioConfig): string[] {
  if (config.source === 'fixtures') return [];
  if (config.source === 'imap') {
    const { user, password } = config.imap;
    return [user ? null : 'IMAP_USER', password ? null : 'IMAP_PASSWORD'].filter((name): name is string => name !== null);
  }
  const { apiToken, accountId, inboxId } = config.mailtrap;
  return [
    apiToken ? null : 'MAILTRAP_API_TOKEN',
    accountId ? null : 'MAILTRAP_ACCOUNT_ID',
    inboxId ? null : 'MAILTRAP_INBOX_ID',
  ].filter((name): name is string => name !== null);
}
