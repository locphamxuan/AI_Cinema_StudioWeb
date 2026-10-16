'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Send, Trash2, Upload } from 'lucide-react';
import { formatBytes } from '@/lib/format';
import { CARD, ErrorCard } from './common';
import { uploadFilm, type UploadedFilm } from './upload-film';

const VERSIONS = [
  { version: 'v1', label: 'Bản giao đầu' },
  { version: 'v2', label: 'Bản sửa theo góp ý' },
  { version: 'v3', label: 'Bản sửa lần 2' },
];
const ACCEPT = '.mp4,.mov,video/mp4,video/quicktime';

/** One slot of the order: nothing yet, a video on its way up, or one stored on the site. */
type Slot = { state: 'empty' } | { state: 'uploading'; name: string; percent: number } | { state: 'ready'; film: UploadedFilm };

/**
 * "Tải video từ máy": the studio picks the video of each ordered episode on its own machine; each one goes up
 * as soon as it is picked, then one mail hands the Creator a download link per episode.
 */
export function UploadReplyPanel({
  messageId,
  contactName,
  contactEmail,
  subjectPrefix,
  partNames,
}: {
  messageId: string;
  contactName: string;
  contactEmail: string;
  /** `[Studio] Giao phim "…" (…)`: the mail subject before the version. */
  subjectPrefix: string;
  /** What each ordered episode is called, in order ("Tập 1", or "Phần 2 (trọn bộ)" for a one-episode order). */
  partNames: string[];
}) {
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[]>(() => partNames.map(() => ({ state: 'empty' })));
  const [version, setVersion] = useState(VERSIONS[0].version);
  const [label, setLabel] = useState(VERSIONS[0].label);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const ready = slots.flatMap((slot, i) => (slot.state === 'ready' ? [{ episode: i + 1, film: slot.film }] : []));
  const uploading = slots.some((slot) => slot.state === 'uploading');

  const setSlot = (index: number, slot: Slot) => setSlots((all) => all.map((old, i) => (i === index ? slot : old)));

  const pick = async (index: number, file: File | undefined) => {
    if (!file) return;
    setError(null);
    setSlot(index, { state: 'uploading', name: file.name, percent: 0 });
    try {
      const film = await uploadFilm(file, (percent) => setSlot(index, { state: 'uploading', name: file.name, percent }));
      setSlot(index, { state: 'ready', film });
    } catch (failure) {
      setSlot(index, { state: 'empty' });
      setError(`${partNames[index]}: ${failure instanceof Error ? failure.message : 'không tải lên được.'}`);
    }
  };

  const drop = async (index: number, film: UploadedFilm) => {
    setSlot(index, { state: 'empty' });
    await fetch(`/api/films/${film.id}`, { method: 'DELETE' }).catch(() => undefined);
  };

  const chooseVersion = (next: string) => {
    setVersion(next);
    setLabel(VERSIONS.find((v) => v.version === next)?.label ?? label);
  };

  const send = async () => {
    setBusy(true);
    setError(null);
    setDone(null);
    setWarning(null);
    const response = await fetch(`/api/messages/${encodeURIComponent(messageId)}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'upload', version, label, note, episodes: ready.map(({ episode, film }) => ({ episode, filmId: film.id })) }),
    });
    setBusy(false);
    if (!response.ok) {
      setError(((await response.json().catch(() => null)) as { error?: string } | null)?.error ?? 'Không gửi được email.');
      return;
    }
    const body = (await response.json().catch(() => null)) as { aiCinema?: { status: string; error?: string } } | null;
    setDone(`Đã gửi ${ready.length} video (${version}) tới ${contactEmail}.`);
    if (body?.aiCinema?.status === 'failed') {
      setWarning(`Email đã gửi nhưng chưa báo được cho AI Cinema (${body.aiCinema.error ?? 'lỗi không rõ'}); Creator sẽ chưa thấy ở tab Studio.`);
    }
    router.refresh();
  };

  return (
    <section className={`${CARD} space-y-4 p-5`} aria-label="Tải video từ máy">
      <p className="text-sm text-muted">
        Chọn video MP4/MOV cho từng tập (tối đa 5 GB mỗi tệp). Mỗi video được tải lên ngay khi chọn; email gửi {contactName} ({contactEmail}) kèm link tải từng tập.
      </p>

      <ol className="space-y-2" aria-label="Video từng tập">
        {slots.map((slot, i) => (
          <li key={partNames[i]} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3 text-sm">
            <span className="w-36 shrink-0 font-semibold">{partNames[i]}</span>
            {slot.state === 'empty' && (
              <label className="flex cursor-pointer items-center gap-2 text-accent hover:underline">
                <Upload className="h-4 w-4" aria-hidden="true" /> Chọn video
                <input type="file" accept={ACCEPT} className="sr-only" aria-label={`Chọn video ${partNames[i]}`} onChange={(e) => void pick(i, e.target.files?.[0])} />
              </label>
            )}
            {slot.state === 'uploading' && (
              <span className="min-w-0 flex-1" role="status">
                <span className="block truncate">{slot.name}</span>
                <span className="mt-1 block h-1.5 rounded bg-border">
                  <span className="block h-1.5 rounded bg-accent" style={{ width: `${slot.percent}%` }} />
                </span>
                <span className="text-xs text-muted">Đang tải lên {slot.percent}%</span>
              </span>
            )}
            {slot.state === 'ready' && (
              <>
                <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                  {slot.film.fileName} <span className="text-muted">· {formatBytes(slot.film.sizeBytes)}</span>
                </span>
                <button type="button" onClick={() => void drop(i, slot.film)} className="flex items-center gap-1 text-xs text-muted hover:text-foreground" aria-label={`Bỏ video ${partNames[i]}`}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" /> Bỏ
                </button>
              </>
            )}
          </li>
        ))}
      </ol>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-muted">Bản giao</span>
          <select value={version} onChange={(e) => chooseVersion(e.target.value)} className="w-full rounded-lg border border-border bg-transparent px-3 py-2">
            {VERSIONS.map((v) => (
              <option key={v.version} value={v.version}>
                {v.version} - {v.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">Tên bản giao</span>
          <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={100} className="w-full rounded-lg border border-border bg-transparent px-3 py-2" />
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">Lời nhắn cho Creator (không bắt buộc)</span>
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} className="w-full rounded-lg border border-border bg-transparent px-3 py-2" />
      </label>

      <div className="rounded-lg bg-black/5 p-3 text-xs dark:bg-white/5" aria-label="Xem trước email">
        <p>
          <span className="text-muted">Tới:</span> {contactName} &lt;{contactEmail}&gt;
        </p>
        <p>
          <span className="text-muted">Tiêu đề:</span> {subjectPrefix} - {label.trim() || '…'} {version}
        </p>
        <p>
          <span className="text-muted">Gồm:</span> {ready.length}/{partNames.length} tập
          {ready.length > 0 && ready.length < partNames.length && ' (các tập còn lại gửi ở thư sau)'}
        </p>
      </div>

      {error && <ErrorCard message={error} />}
      {done && (
        <p role="status" className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {done}
        </p>
      )}
      {warning && (
        <p role="alert" className="text-sm text-amber-700 dark:text-amber-300">
          {warning}
        </p>
      )}
      <button
        type="button"
        onClick={send}
        disabled={busy || uploading || ready.length === 0 || !label.trim()}
        className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        <Send className="h-4 w-4" aria-hidden="true" /> {busy ? 'Đang gửi…' : `Gửi ${ready.length || ''} video cho Creator`}
      </button>
    </section>
  );
}
