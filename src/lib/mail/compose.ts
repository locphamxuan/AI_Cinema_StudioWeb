import type { Brief, BriefPerson } from './brief-parser';

/** What the studio writes on the envelope before sending, like a mail client: To, CC and the subject. */
export interface Compose {
  to: string;
  cc: string[];
  subject: string;
}

const EMAIL = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/u;
const MAX_CC = 10;
const MAX_SUBJECT = 200;

/** Thrown for an envelope that cannot go out; the route turns it into a 400. */
export class ComposeError extends Error {}

/** The envelope the brief asks for: to the contact, CC the other Creators of the season ("Đồng gửi"). */
export function defaultCompose(brief: Pick<Brief, 'contactEmail' | 'coSenders'>, subject: string): Compose {
  return { to: brief.contactEmail, cc: brief.coSenders.map((person) => person.email), subject };
}

/** Reads the envelope a request sends; null when it sends none (the default envelope then applies). */
export function parseCompose(raw: unknown): Compose | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'object') throw new ComposeError('Thông tin người nhận không hợp lệ.');
  const { to, cc, subject } = raw as { to?: unknown; cc?: unknown; subject?: unknown };
  const toEmail = typeof to === 'string' ? to.trim().toLowerCase() : '';
  if (!EMAIL.test(toEmail)) throw new ComposeError('Nhập một email hợp lệ ở ô "Tới".');
  const ccList = (Array.isArray(cc) ? cc : []).map((value) => (typeof value === 'string' ? value.trim().toLowerCase() : ''));
  const wrong = ccList.find((email) => !EMAIL.test(email));
  if (wrong !== undefined) throw new ComposeError(`Email CC không hợp lệ: "${wrong}".`);
  const unique = [...new Set(ccList)].filter((email) => email !== toEmail);
  if (unique.length > MAX_CC) throw new ComposeError(`CC tối đa ${MAX_CC} người.`);
  const title = typeof subject === 'string' ? subject.trim() : '';
  if (!title || title.length > MAX_SUBJECT) throw new ComposeError(`Tiêu đề cần từ 1 đến ${MAX_SUBJECT} ký tự.`);
  return { to: toEmail, cc: unique, subject: title };
}

/** Everyone the brief names: the contact, the co-senders and the owners of the episodes, once each. */
export function briefPeople(brief: Pick<Brief, 'contactName' | 'contactEmail' | 'coSenders' | 'episodeOwners'>): BriefPerson[] {
  const all = [{ name: brief.contactName, email: brief.contactEmail }, ...brief.coSenders, ...brief.episodeOwners];
  return all.filter((person, i) => all.findIndex((other) => other.email === person.email) === i);
}

/** "Chào …": the name the brief gives the address the mail goes to. */
export function greeting(brief: Parameters<typeof briefPeople>[0], to: string): string {
  const person = briefPeople(brief).find((candidate) => candidate.email === to);
  return `Chào ${person?.name ?? 'anh/chị'},`;
}

/** Who answers for the ordered episode at `position` (1-based), as printed in the mail; null on older briefs. */
export function ownerOf(brief: Pick<Brief, 'episodeOwners'>, position: number): string | null {
  const owner = brief.episodeOwners[position - 1];
  return owner ? `Phụ trách: ${owner.name} <${owner.email}>` : null;
}
