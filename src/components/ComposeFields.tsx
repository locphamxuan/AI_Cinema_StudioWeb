'use client';

import { Mail } from 'lucide-react';
import type { ComposeContact, ComposeDraft } from './compose-draft';

const INPUT = 'w-full rounded-lg border border-border bg-transparent px-3 py-2';

/**
 * The envelope of the film mail. It goes to the lead Creator named in the brief and nobody else (BR-67):
 * co-Creators support the lead inside AI Cinema, so the studio never mails them. Only the subject is editable.
 */
export function ComposeFields({
  contact,
  draft,
  autoSubject,
  onChange,
}: {
  contact: ComposeContact;
  draft: ComposeDraft;
  autoSubject: string;
  onChange: (draft: ComposeDraft) => void;
}) {
  return (
    <fieldset className="space-y-3 rounded-lg border border-border p-3">
      <legend className="flex items-center gap-2 px-1 text-sm font-semibold">
        <Mail className="h-4 w-4 text-accent" aria-hidden="true" /> Soạn thư
      </legend>
      <div className="text-sm">
        <span className="mb-1 block text-muted">Tới</span>
        <p aria-label="Người nhận">
          {contact.name} &lt;{contact.email}&gt;
        </p>
        <p className="mt-1 text-xs text-muted">Studio chỉ gửi phim cho Creator chính, đầu mối ghi trong đơn đặt hàng.</p>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">Tiêu đề</span>
        <input value={draft.subject ?? autoSubject} onChange={(e) => onChange({ subject: e.target.value })} maxLength={200} className={INPUT} />
      </label>
    </fieldset>
  );
}
