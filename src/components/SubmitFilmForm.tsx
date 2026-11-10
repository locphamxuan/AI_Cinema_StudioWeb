'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Send } from 'lucide-react';
import { submitFilm } from '@/lib/api/submit-film';
import { EXPIRED_LOGIN_PATH } from '@/lib/session/paths';
import { validateSubmission, type SourceMethod, type SubmissionInput } from '@/lib/domain/submission';
import type { AiDisclosure, LabelType } from '@/lib/api/types';
import { AiDisclosureFields } from './AiDisclosureFields';
import { BUTTON, ErrorCard, INPUT, SuccessCard } from './ui';

const METHODS: { value: SourceMethod; label: string; hint: string }[] = [
  { value: 'UPLOAD', label: 'Tải tệp lên', hint: 'Tệp MP4 hoặc MOV từ máy tính.' },
  { value: 'REMOTE_FILE', label: 'Link tệp video', hint: 'Đường dẫn http(s) tới tệp MP4/MOV, AI Cinema sẽ tải về.' },
  { value: 'HLS_URL', label: 'Link HLS', hint: 'Đường dẫn playlist .m3u8 do Studio lưu trữ.' },
];

const EMPTY_DISCLOSURE: AiDisclosure = { aiGeneratedParts: [], noRealPersonLikeness: false, noCopyrightedMaterial: false };

/** Delivers the film of one episode to the Reviewer, by file or by link, with the AI Disclosure. */
export function SubmitFilmForm({ projectId, episodeId }: { projectId: string; episodeId: string }) {
  const router = useRouter();
  const [method, setMethod] = useState<SourceMethod>('UPLOAD');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [disclosure, setDisclosure] = useState<AiDisclosure>(EMPTY_DISCLOSURE);
  const [labelType, setLabelType] = useState<LabelType | ''>('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  const sending = progress !== null;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const input: SubmissionInput = { method, file, url, disclosure, proposedLabelType: labelType, note };
    const problems = validateSubmission(input);
    setErrors(problems);
    if (problems.length) return;
    setProgress(0);
    const result = await submitFilm(episodeId, input, setProgress);
    setProgress(null);
    if (!result.ok) {
      setErrors([result.error]);
      if (result.status === 401) router.push(EXPIRED_LOGIN_PATH);
      return;
    }
    // No router.refresh(): the episode is no longer open for delivery, so a refreshed page would replace this
    // confirmation with "cannot deliver". The project page loads fresh data when the studio goes back to it.
    setDone(true);
  }

  if (done) {
    return (
      <div className="space-y-3">
        <SuccessCard message="Đã nộp phim cho Reviewer. AI Cinema đang xử lý video; trạng thái tập sẽ cập nhật trong trang dự án." />
        <Link href={`/projects/${projectId}`} className={BUTTON}>Về trang dự án</Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <fieldset className="space-y-2">
        <legend className="font-semibold">Cách nộp phim</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {METHODS.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent/5">
              <input type="radio" name="method" className="mt-0.5 accent-[var(--accent)]" checked={method === option.value} onChange={() => setMethod(option.value)} />
              <span>
                <span className="block font-medium">{option.label}</span>
                <span className="text-xs text-muted">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
        {method === 'UPLOAD' ? (
          <input
            type="file"
            aria-label="Tệp phim"
            accept="video/mp4,video/quicktime,.mp4,.mov"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-accent/10 file:px-3 file:py-2 file:text-accent"
          />
        ) : (
          <input
            type="url"
            aria-label="Đường dẫn phim"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className={INPUT}
            placeholder={method === 'HLS_URL' ? 'https://cdn.studio.vn/tap-1/master.m3u8' : 'https://cdn.studio.vn/tap-1.mp4'}
          />
        )}
      </fieldset>
      <AiDisclosureFields disclosure={disclosure} onDisclosure={setDisclosure} labelType={labelType} onLabelType={setLabelType} />
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Ghi chú cho Reviewer (không bắt buộc)</span>
        <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={2000} className={INPUT} placeholder="Ví dụ: Bản sửa theo góp ý, đã thay nhạc nền ở phút 3." />
      </label>
      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((message) => (
            <ErrorCard key={message} message={message} />
          ))}
        </div>
      )}
      {sending && method === 'UPLOAD' && (
        <div className="space-y-1" aria-live="polite">
          <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
            <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-muted">Đang tải lên {progress}%…</p>
        </div>
      )}
      <button type="submit" disabled={sending} className={BUTTON}>
        <Send className="h-4 w-4" aria-hidden="true" /> {sending ? 'Đang gửi…' : 'Nộp phim cho Reviewer'}
      </button>
    </form>
  );
}
