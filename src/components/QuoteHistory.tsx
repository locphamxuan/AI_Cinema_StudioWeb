import { Badge } from './ui';
import { CONTRACT_STATUS_LABEL, CONTRACT_STATUS_TONE, documentHref } from '@/lib/domain/contract';
import { formatDateTime, formatVnd } from '@/lib/format';
import type { Contract } from '@/lib/api/types';

const PROPOSER: Record<'ADMIN' | 'STUDIO', string> = { ADMIN: 'Admin', STUDIO: 'Studio' };

/** Every quote of every round as one table, newest first: the price history of the negotiations. */
export function QuoteHistory({ rounds }: { rounds: Contract[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-[640px] text-sm">
        <caption className="sr-only">Lịch sử báo giá</caption>
        <thead className="bg-subtle text-left text-xs text-muted">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-medium">Dự án</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Vòng</th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">Giá</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Bên đề xuất</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Trạng thái</th>
            <th scope="col" className="px-4 py-2.5 font-medium">Cập nhật</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rounds.map((round) => (
            <tr key={round.id}>
              <td className="max-w-[220px] truncate px-4 py-2.5 font-medium">{round.project?.movie?.title ?? 'Dự án'}</td>
              <td className="px-4 py-2.5 tabular-nums">{round.round}</td>
              <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                {round.costVnd === null ? <span className="font-normal text-muted">Chưa báo giá</span> : formatVnd(round.costVnd)}
              </td>
              <td className="px-4 py-2.5">{round.proposedBy ? PROPOSER[round.proposedBy] : '-'}</td>
              <td className="px-4 py-2.5">
                <Badge tone={CONTRACT_STATUS_TONE[round.status]}>{CONTRACT_STATUS_LABEL[round.status] ?? round.status}</Badge>
              </td>
              <td className="px-4 py-2.5 text-muted">
                {formatDateTime(round.updatedAt)}
                {round.documents?.some((d) => d.side === 'FINAL') && (
                  <a href={documentHref(round.id, 'FINAL')} className="ml-2 font-semibold text-foreground underline" download>
                    Tải bản đủ chữ ký
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
