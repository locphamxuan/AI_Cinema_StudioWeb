/** Settings read from the environment, on the server only. Read on every call so tests can change them. */

export type MailSource = 'mailtrap' | 'fixtures';

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

export interface StudioConfig {
  source: MailSource;
  mailtrap: MailtrapConfig;
  /** Lower-cased studio addresses whose mail is shown; empty = every hand-off mail of the inbox. */
  studioEmails: string[];
  smtp: SmtpConfig;
  fromName: string;
  fromAddress: string;
  accessCode: string;
  dataDir: string;
}

const text = (value: string | undefined, fallback = '') => value?.trim() || fallback;

type Env = Record<string, string | undefined>;

export function getConfig(env: Env = process.env): StudioConfig {
  return {
    source: env.MAIL_SOURCE === 'fixtures' ? 'fixtures' : 'mailtrap',
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
  };
}

/** What is missing before the mailbox can be read; empty when ready. */
export function missingSettings(config: StudioConfig): string[] {
  if (config.source === 'fixtures') return [];
  const { apiToken, accountId, inboxId } = config.mailtrap;
  return [
    apiToken ? null : 'MAILTRAP_API_TOKEN',
    accountId ? null : 'MAILTRAP_ACCOUNT_ID',
    inboxId ? null : 'MAILTRAP_INBOX_ID',
  ].filter((name): name is string => name !== null);
}
