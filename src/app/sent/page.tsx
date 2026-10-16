import Link from 'next/link';
import { AccessGate } from '@/components/AccessGate';
import { CARD, EmptyNote, Guarded, PageTitle } from '@/components/common';
import { getConfig } from '@/lib/config';
import { formatBytes, formatDateTime } from '@/lib/format';
import { readSent } from '@/lib/sent-log';

export const dynamic = 'force-dynamic';

export default function SentPage() {
  return (
    <AccessGate>
      <PageTitle title="Đã gửi" description="Các email phim Studio đã gửi lại cho Creator của AI Cinema." />
      <Guarded
        load={async () => {
          const records = await readSent(getConfig().dataDir);
          if (records.length === 0) return <EmptyNote>Chưa gửi phim nào.</EmptyNote>;
          return (
            <ul className={`${CARD} divide-y divide-border`}>
              {records.map((record) => (
                <li key={record.id} className="space-y-0.5 px-4 py-3 text-sm">
                  <p className="font-semibold">{record.subject}</p>
                  <p className="text-muted">
                    {formatDateTime(record.sentAt)} · tới {record.to} · {record.episodeCount} tập ·{' '}
                    {record.source === 'upload' ? 'video tải từ máy' : 'phim soạn sẵn'} ·{' '}
                    <Link href={`/messages/${record.messageId}`} className="text-accent hover:underline">
                      xem đơn đặt hàng
                    </Link>
                  </p>
                  {record.files && record.files.length > 0 && (
                    <p className="text-xs text-muted">
                      {record.files.map((file) => `Tập ${file.episode}: ${file.fileName} (${formatBytes(file.sizeBytes)})`).join(' · ')}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          );
        }}
      />
    </AccessGate>
  );
}
