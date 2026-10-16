'use client';

import { Mail, Users } from 'lucide-react';
import { defaultDraft, draftFor, ownersByPerson, type ComposeDraft, type ComposePeople } from './compose-draft';

const INPUT = 'w-full rounded-lg border border-border bg-transparent px-3 py-2';

/**
 * The envelope of the film mail, like a mail client: To, CC and the subject, prefilled from the brief (the
 * contact, CC the "Đồng gửi" Creators). "Chỉ gửi …" addresses one Creator with the episodes they hold.
 */
export function ComposeFields({
  people,
  partNames,
  draft,
  autoSubject,
  onChange,
}: {
  people: ComposePeople;
  partNames: string[];
  draft: ComposeDraft;
  autoSubject: string;
  onChange: (draft: ComposeDraft) => void;
}) {
  const owners = ownersByPerson(people, partNames);
  return (
    <fieldset className="space-y-3 rounded-lg border border-border p-3">
      <legend className="flex items-center gap-2 px-1 text-sm font-semibold">
        <Mail className="h-4 w-4 text-accent" aria-hidden="true" /> Soạn thư
      </legend>

      {owners.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 text-xs" aria-label="Gửi theo người phụ trách">
          <button type="button" onClick={() => onChange(defaultDraft(people))} className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 hover:border-accent">
            <Users className="h-3.5 w-3.5" aria-hidden="true" /> Cả nhóm
          </button>
          {owners.map(({ person, parts }) => (
            <button
              key={person.email}
              type="button"
              onClick={() => onChange({ ...draftFor(people, person), subject: draft.subject })}
              className="rounded-full border border-border px-2.5 py-1 hover:border-accent"
            >
              Chỉ gửi {person.name} ({parts.join(', ')})
            </button>
          ))}
        </div>
      )}

      <label className="block text-sm">
        <span className="mb-1 block text-muted">Tới</span>
        <input type="email" value={draft.to} onChange={(e) => onChange({ ...draft, to: e.target.value })} className={INPUT} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">CC (cách nhau bằng dấu phẩy)</span>
        <input value={draft.cc} onChange={(e) => onChange({ ...draft, cc: e.target.value })} className={INPUT} />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">Tiêu đề</span>
        <input value={draft.subject ?? autoSubject} onChange={(e) => onChange({ ...draft, subject: e.target.value })} maxLength={200} className={INPUT} />
      </label>

      {people.owners.length > 0 && (
        <ul className="space-y-0.5 text-xs text-muted" aria-label="Phân công tập">
          {people.owners.map((owner, i) => (
            <li key={`${owner.episodeNumber}-${i}`}>
              {partNames[i] ?? `Tập ${owner.episodeNumber}`}: {owner.name} &lt;{owner.email}&gt;
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}
