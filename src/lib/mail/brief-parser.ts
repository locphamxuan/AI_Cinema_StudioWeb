import type { MailAttachment, MailMessage } from './types';

/** The subject of the hand-off mail AI Cinema sends a studio (AI_Cinema_BE `BriefService`). */
const BRIEF_SUBJECT = /^\[AI Cinema\] Đơn đặt hàng sản xuất phim\b/u;
const TITLE_AND_SCOPE = /sản xuất phim "(.+)" \((.+)\) gồm (\d+) tập/u;
const FEE = /Phí sản xuất: (\d+) Token \(= (\d+) VND\)/u;
/** Briefs mailed before 2026-10-16 still separate the name and the address with an em dash. */
const CONTACT = /Đầu mối: (.+?) [-—] (\S+@\S+)/u;
const GREETING = /^Kính gửi (.+),$/mu;
const BRIEF_FILE = /^brief-.+\.pdf$/iu;

/** What the studio reads off a hand-off mail: which film, how many episodes, who to answer. */
export interface Brief {
  messageId: string;
  receivedAt: string;
  toEmail: string;
  movieTitle: string;
  /** "Toàn bộ dự án" or "Mùa N". */
  scope: string;
  episodeCount: number;
  feeTokens: number | null;
  feeVnd: number | null;
  studioName: string;
  contactName: string;
  contactEmail: string;
  attachments: MailAttachment[];
  /** The brief PDF among the attachments, when there is one. */
  briefFile: MailAttachment | null;
}

export function isBriefSubject(subject: string): boolean {
  return BRIEF_SUBJECT.test(subject.trim());
}

/** Reads a hand-off mail; null for any other mail or one that does not say whom to answer. */
export function parseBrief(message: MailMessage): Brief | null {
  if (!isBriefSubject(message.subject)) return null;
  const film = TITLE_AND_SCOPE.exec(message.text);
  const contact = CONTACT.exec(message.text);
  if (!film || !contact) return null;
  const fee = FEE.exec(message.text);
  return {
    messageId: message.id,
    receivedAt: message.receivedAt,
    toEmail: message.toEmail,
    movieTitle: film[1],
    scope: film[2],
    episodeCount: Number(film[3]),
    feeTokens: fee ? Number(fee[1]) : null,
    feeVnd: fee ? Number(fee[2]) : null,
    studioName: GREETING.exec(message.text)?.[1] ?? 'Studio',
    contactName: contact[1].trim(),
    contactEmail: contact[2].trim().toLowerCase(),
    attachments: message.attachments,
    briefFile: message.attachments.find((file) => BRIEF_FILE.test(file.fileName)) ?? null,
  };
}
