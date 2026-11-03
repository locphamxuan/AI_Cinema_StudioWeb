import type { Brief } from './brief-parser';

/**
 * The envelope of a film mail. It always goes to the brief's contact, the lead Creator, and to nobody else
 * (BR-67): co-Creators support the lead inside AI Cinema and never get mail from the studio. Only the subject
 * is the studio's to write.
 */
export interface Compose {
  to: string;
  subject: string;
}

const MAX_SUBJECT = 200;

/** Thrown for an envelope that cannot go out; the route turns it into a 400. */
export class ComposeError extends Error {}

/** Reads the subject a request sends; null when it sends none (the default subject then applies). */
export function parseSubject(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'object') throw new ComposeError('Thông tin thư không hợp lệ.');
  const { subject } = raw as { subject?: unknown };
  const title = typeof subject === 'string' ? subject.trim() : '';
  if (!title || title.length > MAX_SUBJECT) throw new ComposeError(`Tiêu đề cần từ 1 đến ${MAX_SUBJECT} ký tự.`);
  return title;
}

/** To the lead Creator named in the brief, under the subject the studio wrote or `fallbackSubject`. */
export function envelopeFor(brief: Pick<Brief, 'contactEmail'>, subject: string | null | undefined, fallbackSubject: string): Compose {
  return { to: brief.contactEmail, subject: subject ?? fallbackSubject };
}

/** "Chào …": the lead Creator the mail goes to. */
export function greeting(brief: Pick<Brief, 'contactName'>): string {
  return `Chào ${brief.contactName || 'anh/chị'},`;
}
