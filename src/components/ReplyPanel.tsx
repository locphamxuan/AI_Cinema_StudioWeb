'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Film, Send } from 'lucide-react';
import { formatDuration } from '@/lib/format';
import { CARD, ErrorCard } from './common';

export interface DeliveryView {
  version: string;
  label: string;
  summary: string;
  episodes: { title: string; durationSeconds: number }[];
  /** How many times this version already went back for this order. */
  timesSent: number;
}

/**
 * "Gửi lại phim": the prepared versions of the film the studio can hand back. v1 is the first delivery,
 * v2 the fixed one after the Reviewer asked for changes. Sending emails the Creator named in the brief.
 */
export function ReplyPanel({
  messageId,
  contactName,
  contactEmail,
  deliveries,
  generic,
}: {
  messageId: string;
  contactName: string;
  contactEmail: string;
  deliveries: DeliveryView[];
  /** The films are the studio's general ones, not made for this title. */
  generic: boolean;
}) {
  const router = useRouter();
  const [version, setVersion] = useState(deliveries[0]?.version ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const chosen = deliveries.find((delivery) => delivery.version === version);

  const send = async () => {
    setBusy(true);
    setError(null);
    setDone(null);
    const response = await fetch(`/api/messages/${encodeURIComponent(messageId)}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version }),
    });
    setBusy(false);
    if (response.ok) {
      setDone(`Đã gửi phim ${version} tới ${contactEmail}.`);
      router.refresh();
    } else {
      setError(((await response.json().catch(() => null)) as { error?: string } | null)?.error ?? 'Không gửi được email.');
    }
  };

  return (
    <section className={`${CARD} space-y-4 p-5`} aria-label="Gửi lại phim">
      <div>
        <h2 className="flex items-center gap-2 font-semibold">
          <Film className="h-4 w-4 text-accent" aria-hidden="true" /> Gửi lại phim
        </h2>
        <p className="text-sm text-muted">
          Studio không sản xuất video: gửi bản phim đã soạn sẵn cho {contactName} ({contactEmail}) qua email. Creator tải phim và upload lên AI Cinema.
        </p>
        {generic && <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">Chưa có phim soạn sẵn riêng cho dự án này — dùng bộ phim mẫu của Studio.</p>}
      </div>

      <fieldset className="space-y-2">
        <legend className="sr-only">Chọn bản giao</legend>
        {deliveries.map((delivery) => (
          <label key={delivery.version} className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 has-[:checked]:border-accent">
            <input type="radio" name="version" value={delivery.version} checked={version === delivery.version} onChange={() => setVersion(delivery.version)} className="mt-1" />
            <span className="min-w-0 flex-1 text-sm">
              <span className="font-semibold">
                {delivery.label} ({delivery.version})
              </span>
              {delivery.timesSent > 0 && <span className="ml-2 text-xs text-emerald-700 dark:text-emerald-300">đã gửi {delivery.timesSent} lần</span>}
              <span className="block text-muted">{delivery.summary}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {chosen && (
        <ol className="space-y-1 text-sm" aria-label={`Các tập của bản ${chosen.version}`}>
          {chosen.episodes.map((episode, i) => (
            <li key={`${episode.title}-${i}`} className="flex justify-between gap-3">
              <span className="truncate">
                Tập {i + 1} — {episode.title}
              </span>
              <span className="shrink-0 text-muted">{formatDuration(episode.durationSeconds)}</span>
            </li>
          ))}
        </ol>
      )}

      {error && <ErrorCard message={error} />}
      {done && (
        <p role="status" className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {done}
        </p>
      )}
      <button
        type="button"
        onClick={send}
        disabled={busy || !chosen}
        className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        <Send className="h-4 w-4" aria-hidden="true" /> {busy ? 'Đang gửi…' : 'Gửi lại phim'}
      </button>
    </section>
  );
}
