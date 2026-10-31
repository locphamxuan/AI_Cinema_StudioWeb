/** The lead Creator named in the brief: the only person the studio mails (BR-67). */
export interface ComposeContact {
  name: string;
  email: string;
}

/** The envelope while the studio edits it; `subject` null follows the version picked. */
export interface ComposeDraft {
  subject: string | null;
}

export const defaultDraft = (): ComposeDraft => ({ subject: null });

/** What the reply route reads as `compose`. */
export function composePayload(draft: ComposeDraft, autoSubject: string) {
  return { subject: (draft.subject ?? autoSubject).trim() };
}
