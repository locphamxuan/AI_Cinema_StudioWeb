import { Download, FileText } from 'lucide-react';
import { deliveriesFor } from '@/lib/demo/match';
import type { DemoCatalog } from '@/lib/demo/catalog';
import { formatBytes, formatDateTime, formatNumber } from '@/lib/format';
import type { BriefRow } from '@/lib/studio';
import { CARD } from './common';
import { ReplyPanel } from './ReplyPanel';

/** One hand-off mail in full: what is ordered, who to answer, the attachments, and the films to send back. */
export function BriefDetail({ row, catalog }: { row: BriefRow; catalog: DemoCatalog }) {
  const { brief, sent } = row;
  const { specific, deliveries } = deliveriesFor(brief, catalog);
  const views = deliveries.map((delivery) => ({
    version: delivery.version,
    label: delivery.label,
    summary: delivery.summary,
    episodes: delivery.episodes,
    timesSent: sent.filter((record) => record.version === delivery.version).length,
  }));

  return (
    <div className="space-y-5">
      <section className={`${CARD} space-y-3 p-5`} aria-label="Đơn đặt hàng">
        <div>
          <h1 className="text-xl font-bold">{brief.movieTitle}</h1>
          <p className="text-sm text-muted">
            {brief.scope} · {brief.episodeCount} tập · nhận lúc {formatDateTime(brief.receivedAt)}
          </p>
        </div>
        <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <div className="flex gap-2">
            <dt className="w-32 shrink-0 text-muted">Gửi tới</dt>
            <dd>{brief.studioName}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-32 shrink-0 text-muted">Đầu mối AI Cinema</dt>
            <dd>
              {brief.contactName} - {brief.contactEmail}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-32 shrink-0 text-muted">Phí sản xuất</dt>
            <dd>{brief.feeTokens === null ? '-' : `${formatNumber(brief.feeTokens)} Token (${formatNumber(brief.feeVnd)} ₫)`}</dd>
          </div>
        </dl>
        <div>
          <h2 className="mb-1 text-sm font-semibold">Tệp đính kèm</h2>
          {brief.attachments.length === 0 ? (
            <p className="text-sm text-muted">Thư không có tệp đính kèm.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {brief.attachments.map((file) => (
                <li key={file.id} className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">
                    {file.fileName} <span className="text-muted">· {formatBytes(file.sizeBytes)}</span>
                  </span>
                  <a
                    href={`/api/messages/${encodeURIComponent(brief.messageId)}/attachments/${encodeURIComponent(file.id)}`}
                    className="flex items-center gap-1 text-accent hover:underline"
                    aria-label={`Tải ${file.fileName}`}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" /> Tải
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <ReplyPanel messageId={brief.messageId} contactName={brief.contactName} contactEmail={brief.contactEmail} deliveries={views} generic={!specific} />

      {sent.length > 0 && (
        <section className={`${CARD} p-5`} aria-label="Đã gửi cho đơn này">
          <h2 className="mb-2 font-semibold">Đã gửi cho đơn này</h2>
          <ul className="space-y-1 text-sm">
            {sent.map((record) => (
              <li key={record.id}>
                {formatDateTime(record.sentAt)} - bản {record.version}, {record.episodeCount} tập, tới {record.to}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
