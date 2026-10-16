import type { BriefPerson, EpisodeOwner } from '@/lib/mail/brief-parser';

/** The people a brief names, as the reply panels need them. */
export interface ComposePeople {
  contact: BriefPerson;
  coSenders: BriefPerson[];
  /** Who answers for each ordered episode, in order; empty on older briefs. */
  owners: EpisodeOwner[];
}

/** The envelope while the studio edits it; `subject` null follows the version picked. */
export interface ComposeDraft {
  to: string;
  cc: string;
  subject: string | null;
}

export function defaultDraft(people: ComposePeople): ComposeDraft {
  return { to: people.contact.email, cc: people.coSenders.map((p) => p.email).join(', '), subject: null };
}

/** Each Creator who holds episodes, with the parts they hold, for "send only to …". */
export function ownersByPerson(people: ComposePeople, partNames: string[]): { person: BriefPerson; parts: string[] }[] {
  const byEmail = new Map<string, { person: BriefPerson; parts: string[] }>();
  people.owners.forEach((owner, i) => {
    const row = byEmail.get(owner.email) ?? { person: { name: owner.name, email: owner.email }, parts: [] };
    row.parts.push(partNames[i] ?? `Tập ${owner.episodeNumber}`);
    byEmail.set(owner.email, row);
  });
  return [...byEmail.values()];
}

/** Only to `person`; the contact stays in CC so the lead Creator follows every film. */
export function draftFor(people: ComposePeople, person: BriefPerson): ComposeDraft {
  return { to: person.email, cc: person.email === people.contact.email ? '' : people.contact.email, subject: null };
}

/** What the reply route reads as `compose`. */
export function composePayload(draft: ComposeDraft, autoSubject: string) {
  return {
    to: draft.to.trim(),
    cc: draft.cc
      .split(/[,;]/)
      .map((email) => email.trim())
      .filter(Boolean),
    subject: (draft.subject ?? autoSubject).trim(),
  };
}
