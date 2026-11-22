'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ImageUp } from 'lucide-react';
import { posterProblem, POSTER_ACCEPT, uploadPoster } from '@/lib/api/upload-poster';
import type { StudioPoster } from '@/lib/api/types';
import { formatBytes, formatDateTime } from '@/lib/format';
import { EXPIRED_LOGIN_PATH } from '@/lib/session/paths';
import { BUTTON, CARD, ErrorCard, SuccessCard } from './ui';

/** The poster image of the movie, sent by the studio with its film; a new one replaces the old one. */
export function PosterUpload({ projectId, poster }: { projectId: string; poster: StudioPoster | null }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [current, setCurrent] = useState<StudioPoster | null>(poster);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (sending) return;
    const problem = posterProblem(file);
    setError(problem);
    setDone(false);
    if (problem || !file) return;
    setSending(true);
    const result = await uploadPoster(projectId, file);
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      if (result.status === 401) router.push(EXPIRED_LOGIN_PATH);
      return;
    }
    setCurrent(result.studioPoster);
    setFile(null);
    setDone(true);
    router.refresh();
  }

  return (
    <section className={`${CARD} space-y-3.5 p-6`}>
      <h2 className="text-base font-bold">Poster phim</h2>
      <p className="text-sm text-muted">
        {current
          ? `Đã nộp poster lúc ${formatDateTime(current.uploadedAt)}: ${current.fileName}.`
          : 'Chưa nộp poster. Hãy gửi ảnh poster của phim để AI Cinema đặt lên trang phim.'}
      </p>
      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        <input
          key={done ? 'sent' : 'choose'}
          type="file"
          aria-label="Ảnh poster"
          accept={POSTER_ACCEPT}
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setDone(false);
          }}
          className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-accent/10 file:px-4 file:py-2 file:font-semibold file:text-accent"
        />
        <p className="text-xs text-muted">
          {file ? `Đã chọn ${file.name} (${formatBytes(file.size)}).` : 'Ảnh PNG, JPG, WebP, GIF, BMP hoặc AVIF, tối đa 20 MB.'}
        </p>
        {error && <ErrorCard message={error} />}
        {done && <SuccessCard message="Đã nộp poster." />}
        <button type="submit" disabled={sending} className={BUTTON}>
          <ImageUp className="h-4 w-4" aria-hidden="true" />
          {sending ? 'Đang tải poster lên…' : current ? 'Nộp lại poster' : 'Tải poster lên'}
        </button>
      </form>
    </section>
  );
}
