import Link from 'next/link';
import { MessageSquareWarning, Upload } from 'lucide-react';
import { Badge, BUTTON, type Tone } from './ui';
import { canSubmit, EPISODE_STATUS_LABEL, INGEST_STATUS_LABEL } from '@/lib/domain/episode';
import { daysUntil, formatDate, formatDateTime, formatDuration } from '@/lib/format';
import type { EpisodeStatus, PortalEpisode } from '@/lib/api/types';

const TONE: Partial<Record<EpisodeStatus, Tone>> = {
  AWAITING_MEDIA: 'action',
  CHANGES_REQUESTED: 'danger',
  PROCESSING: 'waiting',
  IN_REVIEW: 'waiting',
  APPROVED: 'done',
  LABELED: 'done',
  COMPLIANCE_PASSED: 'done',
  SCHEDULED: 'done',
  PUBLISHED: 'done',
};

function Deadline({ iso, open }: { iso: string | null; open: boolean }) {
  if (!iso) return <span className="text-muted">Chưa đặt hạn</span>;
  const days = daysUntil(iso);
  let note = '';
  if (open && days !== null) note = days < 0 ? ` (quá hạn ${-days} ngày)` : days === 0 ? ' (hôm nay)' : ` (còn ${days} ngày)`;
  return <span className={open && days !== null && days < 0 ? 'text-red-600 dark:text-red-300' : ''}>{formatDate(iso)}{note}</span>;
}

/** An episode the studio owes: deadline, state, its latest delivery and what the Reviewer asked to change. */
export function EpisodeCard({ projectId, episode, contractSigned }: { projectId: string; episode: PortalEpisode; contractSigned: boolean }) {
  const check = canSubmit(contractSigned, episode.status);
  const delivery = episode.latestDelivery;
  const deadline = episode.deliveryDeadline ?? episode.dueDate;
  return (
    <article className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">Tập {episode.episodeNumber}: {episode.title}</h3>
          <p className="text-sm text-muted">
            Hạn giao: <Deadline iso={deadline} open={check.allowed} /> · Thời lượng mục tiêu {formatDuration(episode.targetDurationSeconds)}
          </p>
        </div>
        <Badge tone={TONE[episode.status] ?? 'muted'}>{EPISODE_STATUS_LABEL[episode.status] ?? episode.status}</Badge>
      </div>
      {episode.synopsis && <p className="text-sm whitespace-pre-line">{episode.synopsis}</p>}
      {delivery ? (
        <div className="rounded-lg border border-border bg-background p-3 text-sm">
          <p>
            Bản nộp mới nhất: <strong>phiên bản {delivery.version}</strong> · {INGEST_STATUS_LABEL[delivery.ingestStatus] ?? delivery.ingestStatus} ·{' '}
            {formatDateTime(delivery.createdAt)}
          </p>
          {delivery.failureReason && <p className="mt-1 text-red-600 dark:text-red-300">Lỗi xử lý: {delivery.failureReason}</p>}
        </div>
      ) : (
        <p className="text-sm text-muted">Chưa có bản nộp nào.</p>
      )}
      {delivery?.changeRequest && (
        <div className="space-y-1 rounded-lg border border-red-300 bg-red-50 p-3 text-sm dark:border-red-500/40 dark:bg-red-500/10">
          <p className="flex items-center gap-1.5 font-semibold text-red-800 dark:text-red-200">
            <MessageSquareWarning className="h-4 w-4" aria-hidden="true" /> Reviewer yêu cầu sửa ({formatDateTime(delivery.changeRequest.createdAt)})
          </p>
          <p className="whitespace-pre-line">{delivery.changeRequest.comments || 'Không có ghi chú.'}</p>
        </div>
      )}
      {check.allowed ? (
        <Link href={`/projects/${projectId}/episodes/${episode.id}`} className={BUTTON}>
          <Upload className="h-4 w-4" aria-hidden="true" /> {delivery ? 'Nộp lại phim' : 'Nộp phim'}
        </Link>
      ) : (
        <p className="text-xs text-muted">{check.reason}</p>
      )}
    </article>
  );
}
