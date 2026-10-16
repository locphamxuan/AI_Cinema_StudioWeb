import { randomUUID } from 'node:crypto';
import { getConfig, missingSettings, type StudioConfig } from './config';
import { loadCatalog, loadScript, type DemoCatalog } from './demo/catalog';
import { composeFilmMail } from './demo/film-mail';
import { deliveriesFor } from './demo/match';
import { parseBrief, isBriefSubject, type Brief } from './mail/brief-parser';
import { HttpFilmNotifier, MemoryNotifier, type FilmNotifier, type FilmSentReport } from './mail/film-notifier';
import { FixtureInbox } from './mail/fixtures';
import { ImapInbox } from './mail/imap-inbox';
import { MailtrapInbox } from './mail/mailtrap-inbox';
import { MemorySender, SmtpSender } from './mail/smtp-sender';
import type { MailInbox, MailSender, OutgoingMail } from './mail/types';
import { readFilm } from './films';
import { appendSent, readSent, sentFor, type SentRecord } from './sent-log';
import { composeUploadMail, type UploadedEpisode } from './upload-mail';

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
  /** Null when AI_CINEMA_API_URL / STUDIO_WEBHOOK_TOKEN are not set: the Creator is then only told by email. */
  notifier: FilmNotifier | null;
  catalog: () => Promise<DemoCatalog>;
}

/** Whether AI Cinema was told about a film that went out. */
export type AiCinemaNotice = { status: 'notified' } | { status: 'skipped' } | { status: 'failed'; error: string };

function createInbox(config: StudioConfig): MailInbox {
  if (config.source === 'fixtures') return new FixtureInbox();
  return config.source === 'imap' ? new ImapInbox(config.imap) : new MailtrapInbox(config.mailtrap);
}

function createNotifier(config: StudioConfig): FilmNotifier | null {
  if (config.source === 'fixtures') return new MemoryNotifier();
  const { apiUrl, token } = config.aiCinema;
  return apiUrl && token ? new HttpFilmNotifier(config.aiCinema) : null;
}

/** The mailbox and the sender the config asks for; `fixtures` needs no network and sends nothing. */
export function createServices(config: StudioConfig = getConfig()): StudioServices {
  const fixtures = config.source === 'fixtures';
  return {
    config,
    inbox: createInbox(config),
    sender: fixtures ? new MemorySender() : new SmtpSender(config.smtp, { name: config.fromName, address: config.fromAddress }),
    notifier: createNotifier(config),
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

/**
 * Sends the prepared film `version` back to the Creator named in the brief and records it, then tells AI Cinema
 * so the Creator and Reviewer see it in the app. The mail is what counts: a failed report never undoes it.
 */
export async function replyWithFilm(
  services: StudioServices,
  messageId: string,
  version: string,
): Promise<SentRecord & { aiCinema: AiCinemaNotice }> {
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
  return deliver(services, brief, mail, {
    source: 'prepared',
    version: delivery.version,
    label: delivery.label,
    episodeCount: delivery.episodes.length,
  });
}

/** What the studio asks for when it hands back videos it uploaded: which version, a note, a video per episode. */
export interface UploadReplyRequest {
  version: string;
  label: string;
  note: string;
  episodes: { episode: number; filmId: string }[];
}

/** Hands back the videos the studio uploaded from its own machine, one download link per ordered episode. */
export async function replyWithUpload(
  services: StudioServices,
  messageId: string,
  request: UploadReplyRequest,
): Promise<SentRecord & { aiCinema: AiCinemaNotice }> {
  const { brief } = await getBrief(services, messageId);
  const episodes = await uploadedEpisodes(services.config.dataDir, brief, request.episodes);
  const delivery = { version: request.version.trim(), label: request.label.trim(), note: request.note, episodes };
  if (!/^v\d{1,3}$/.test(delivery.version)) throw new StudioError(400, 'Bản giao phải có dạng v1, v2, ...');
  if (!delivery.label || delivery.label.length > 100) throw new StudioError(400, 'Đặt tên cho bản giao (tối đa 100 ký tự).');
  if (request.note.length > 2000) throw new StudioError(400, 'Lời nhắn tối đa 2000 ký tự.');

  const mail = composeUploadMail({ brief, delivery, studioName: services.config.fromName, publicUrl: services.config.publicUrl });
  return deliver(services, brief, mail, {
    source: 'upload',
    version: delivery.version,
    label: delivery.label,
    episodeCount: episodes.length,
    files: episodes.map(({ episode, film }) => ({ episode, fileName: film.fileName, sizeBytes: film.sizeBytes })),
  });
}

async function uploadedEpisodes(dataDir: string, brief: Brief, picked: UploadReplyRequest['episodes']) {
  if (!picked.length) throw new StudioError(400, 'Chọn ít nhất một video để gửi.');
  const seen = new Set<number>();
  const episodes: UploadedEpisode[] = [];
  for (const { episode, filmId } of picked) {
    if (!Number.isInteger(episode) || episode < 1 || episode > brief.episodeCount || seen.has(episode)) {
      throw new StudioError(400, `Tập ${episode} không có trong đơn đặt hàng (${brief.episodeCount} tập) hoặc bị chọn hai lần.`);
    }
    const film = await readFilm(dataDir, filmId);
    if (!film) throw new StudioError(400, `Video của tập ${episode} không còn trên Studio Web; hãy tải lên lại.`);
    seen.add(episode);
    episodes.push({ episode, film });
  }
  return episodes;
}

/** Mails the film, keeps it in the sent log, then tells AI Cinema. The mail is what counts: a failed report never undoes it. */
async function deliver(
  services: StudioServices,
  brief: Brief,
  mail: OutgoingMail,
  sent: Pick<SentRecord, 'source' | 'version' | 'label' | 'episodeCount' | 'files'>,
): Promise<SentRecord & { aiCinema: AiCinemaNotice }> {
  try {
    await services.sender.send(mail);
  } catch (error) {
    throw new StudioError(502, `Không gửi được email tới ${mail.to}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const record: SentRecord = {
    id: randomUUID(),
    messageId: brief.messageId,
    to: mail.to,
    subject: mail.subject,
    movieTitle: brief.movieTitle,
    sentAt: new Date().toISOString(),
    ...sent,
  };
  await appendSent(services.config.dataDir, record);
  const aiCinema = await tellAiCinema(services, {
    studioEmail: brief.toEmail,
    creatorEmail: brief.contactEmail,
    movieTitle: brief.movieTitle,
    scope: brief.scope,
    version: sent.version,
    label: sent.label ?? '',
    episodeCount: sent.episodeCount,
  });
  return { ...record, aiCinema };
}

async function tellAiCinema(services: StudioServices, report: FilmSentReport): Promise<AiCinemaNotice> {
  if (!services.notifier) return { status: 'skipped' };
  try {
    await services.notifier.filmSent(report);
    return { status: 'notified' };
  } catch (error) {
    return { status: 'failed', error: error instanceof Error ? error.message : String(error) };
  }
}
