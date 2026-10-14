import Link from 'next/link';
import { Mail, Paperclip } from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import type { BriefRow } from '@/lib/studio';
import { CARD, EmptyNote } from './common';

/** The hand-off mails AI Cinema sent this studio, newest first, each marked once a film went back. */
export function BriefList({ rows }: { rows: BriefRow[] }) {
  if (rows.length === 0) {
    return <EmptyNote>Chưa có đơn đặt hàng nào. Khi Creator bàn giao dự án cho Studio, email brief sẽ hiện ở đây.</EmptyNote>;
  }
  return (
    <ul className={`${CARD} divide-y divide-border`}>
      {rows.map(({ brief, sent }) => (
        <li key={brief.messageId}>
          <Link href={`/messages/${brief.messageId}`} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-foreground/5">
            <Mail className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">
                {brief.movieTitle} <span className="font-normal text-muted">· {brief.scope} · {brief.episodeCount} tập</span>
              </p>
              <p className="truncate text-xs text-muted">
                Từ AI Cinema · đầu mối {brief.contactName} ({brief.contactEmail}) · {formatDateTime(brief.receivedAt)}
              </p>
            </div>
            {brief.briefFile && <Paperclip className="h-4 w-4 text-muted" aria-label="Có brief PDF" />}
            {sent.length > 0 ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200">
                Đã gửi {sent.map((record) => record.version).join(', ')}
              </span>
            ) : (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                Chưa trả phim
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
