'use client';

import { AI_PARTS, LABEL_TYPES } from '@/lib/domain/submission';
import type { AiDisclosure, AiGeneratedPart, LabelType } from '@/lib/api/types';
import { INPUT } from './ui';

const CHECK = 'mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]';

/** The AI Disclosure (BR-41) every delivery carries, and the AI label the studio proposes (BR-40). */
export function AiDisclosureFields({
  disclosure,
  onDisclosure,
  labelType,
  onLabelType,
}: {
  disclosure: AiDisclosure;
  onDisclosure: (next: AiDisclosure) => void;
  labelType: LabelType | '';
  onLabelType: (next: LabelType | '') => void;
}) {
  const togglePart = (part: AiGeneratedPart, on: boolean) =>
    onDisclosure({
      ...disclosure,
      aiGeneratedParts: on
        ? [...disclosure.aiGeneratedParts, part]
        : disclosure.aiGeneratedParts.filter((value) => value !== part),
    });
  return (
    <fieldset className="space-y-3">
      <legend className="font-semibold">Khai báo sử dụng AI (bắt buộc)</legend>
      <div className="space-y-1 text-sm">
        <p className="font-medium">Những phần có dùng AI</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {AI_PARTS.map(({ value, label }) => (
            <label key={value} className="flex items-start gap-2">
              <input
                type="checkbox"
                className={CHECK}
                checked={disclosure.aiGeneratedParts.includes(value)}
                onChange={(event) => togglePart(value, event.target.checked)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className={CHECK}
          checked={disclosure.noRealPersonLikeness}
          onChange={(event) => onDisclosure({ ...disclosure, noRealPersonLikeness: event.target.checked })}
        />
        <span>Studio cam kết phim không dùng hình ảnh, giọng nói của người thật hay sự kiện thật gây hiểu lầm.</span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className={CHECK}
          checked={disclosure.noCopyrightedMaterial}
          onChange={(event) => onDisclosure({ ...disclosure, noCopyrightedMaterial: event.target.checked })}
        />
        <span>Studio cam kết phim không dùng tư liệu có bản quyền của bên thứ ba.</span>
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Loại nhãn AI đề xuất</span>
        <select value={labelType} onChange={(event) => onLabelType(event.target.value as LabelType | '')} className={INPUT}>
          <option value="">-- Chọn loại nhãn --</option>
          {LABEL_TYPES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <span className="block text-xs text-muted">Reviewer của AI Cinema quyết định nhãn cuối cùng.</span>
      </label>
    </fieldset>
  );
}
