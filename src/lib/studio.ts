import { randomUUID } from 'node:crypto';
import { getConfig, missingSettings, type StudioConfig } from './config';
import { loadCatalog, loadScript, type DemoCatalog } from './demo/catalog';
import { composeFilmMail } from './demo/film-mail';
import { deliveriesFor } from './demo/match';
import { parseBrief, isBriefSubject, type Brief } from './mail/brief-parser';
import { FixtureInbox } from './mail/fixtures';
import { MailtrapInbox } from './mail/mailtrap-inbox';
import { MemorySender, SmtpSender } from './mail/smtp-sender';
import type { MailInbox, MailSender } from './mail/types';
import { appendSent, readSent, sentFor, type SentRecord } from './sent-log';

/** An answer the site can give a visitor for something that cannot be done, with the HTTP status it maps to. */
export class StudioError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'StudioError';
  }
}

export interface StudioServices {
  config: StudioConfig;
  inbox: MailInbox;
  sender: MailSender;
  catalog: () => Promise<DemoCatalog>;
}

/** The mailbox and the sender the config asks for; `fixtures` needs no network and sends nothing. */
export function createServices(config: StudioConfig = getConfig()): StudioServices {
  const fixtures = config.source === 'fixtures';
  return {
    config,
    inbox: fixtures ? new FixtureInbox() : new MailtrapInbox(config.mailtrap),
    sender: fixtures ? new MemorySender() : new SmtpSender(config.smtp, { name: config.fromName, address: config.fromAddress }),
    catalog: () => loadCatalog(),
  };
}

export interface BriefRow {
  brief: Brief;
  sent: SentRecord[];
}

const MAX_BRIEFS = 30;

function assertReady(config: StudioConfig): void {
  const missing = missingSettings(config);
  if (missing.length) {
    throw new StudioError(503, `Chưa cấu hình hộp thư của Studio: thiếu ${missing.join(', ')}. Xem .env.example.`);
  }
}

/** The hand-off mails addressed to this studio, newest first, with the films already sent back for each. */
export async function listBriefs(services: StudioServices): Promise<BriefRow[]> {
  const { config, inbox } = services;
  assertReady(config);
  const messages = (await inbox.list())
    .filter((message) => isBriefSubject(message.subject))
    .filter((message) => !config.studioEmails.length || config.studioEmails.includes(message.toEmail))
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
    .slice(0, MAX_BRIEFS);
  const [details, sent] = await Promise.all([Promise.all(messages.map((m) => inbox.get(m.id))), readSent(config.dataDir)]);
  return details.flatMap((message) => {
    const brief = message && parseBrief(message);
    return brief ? [{ brief, sent: sentFor(sent, brief.messageId) }] : [];
  });
}

export async function getBrief(services: StudioServices, id: string): Promise<BriefRow> {
  assertReady(services.config);
  const message = await services.inbox.get(id);
  const brief = message && parseBrief(message);
  if (!brief) throw new StudioError(404, 'Không tìm thấy thư đặt hàng này.');
  return { brief, sent: sentFor(await readSent(services.config.dataDir), id) };
}

/** Sends the prepared film `version` back to the Creator named in the brief and records it. */
export async function replyWithFilm(services: StudioServices, messageId: string, version: string): Promise<SentRecord> {
  const { brief } = await getBrief(services, messageId);
  const { project, deliveries } = deliveriesFor(brief, await services.catalog());
  const delivery = deliveries.find((candidate) => candidate.version === version);
  if (!delivery) throw new StudioError(400, `Chưa có bản giao "${version}" cho phim này.`);

  const mail = composeFilmMail({
    brief,
    project,
    delivery,
    script: await loadScript(project),
    studioName: services.config.fromName,
  });
  try {
    await services.sender.send(mail);
  } catch (error) {
    throw new StudioError(502, `Không gửi được email tới ${mail.to}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const record: SentRecord = {
    id: randomUUID(),
    messageId,
    version: delivery.version,
    to: mail.to,
    subject: mail.subject,
    movieTitle: brief.movieTitle,
    episodeCount: delivery.episodes.length,
    sentAt: new Date().toISOString(),
  };
  await appendSent(services.config.dataDir, record);
  return record;
}
