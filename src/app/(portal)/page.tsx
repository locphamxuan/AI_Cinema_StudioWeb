import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import { markAllNotificationsRead } from '@/app/actions/notifications';
import { Badge, CARD, EmptyNote, Facts, Guarded, PageTitle } from '@/components/ui';
import { needsStudio } from '@/lib/domain/contract';
import { formatDateTime } from '@/lib/format';
import { pagePortal } from '@/lib/session/server';
import type { PortalNotification } from '@/lib/api/types';

export const metadata = { title: 'Tổng quan - Studio Web' };

function NotificationItem({ item }: { item: PortalNotification }) {
  return (
    <li className="flex gap-3 px-4 py-3">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.readAt ? 'bg-transparent' : 'bg-accent'}`} aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className={`text-sm ${item.readAt ? '' : 'font-semibold'}`}>{item.title}</p>
        {item.body && <p className="text-sm whitespace-pre-line text-muted">{item.body}</p>}
        <p className="text-xs text-muted">{formatDateTime(item.createdAt)}</p>
      </div>
    </li>
  );
}

async function Overview() {
  const api = await pagePortal();
  const [studio, contracts, projects, notifications] = await Promise.all([
    api.me(),
    api.contracts(),
    api.projects(),
    api.notifications(20),
  ]);
  const waiting = contracts.filter(needsStudio).length;
  const producing = projects.filter((project) => project.status === 'IN_PRODUCTION').length;
  const unread = notifications.data.filter((item) => !item.readAt).length;
  return (
    <>
      <PageTitle title={`Xin chào, ${studio.name}`} description="Theo dõi hợp đồng, dự án và yêu cầu của AI Cinema." />
      <div className="grid gap-4 md:grid-cols-3">
        <section className={`${CARD} space-y-3 p-4 md:col-span-1`}>
          <h2 className="font-semibold">Thông tin Studio</h2>
          <Facts
            items={[
              ['Tên', studio.name],
              ['Email', studio.email ?? '-'],
              ['Người liên hệ', studio.contactName ?? '-'],
              ['Điện thoại', studio.phone ?? '-'],
            ]}
          />
        </section>
        <Link href="/contracts" className={`${CARD} space-y-1 p-4 hover:border-accent`}>
          <p className="text-sm text-muted">Hợp đồng chờ Studio xử lý</p>
          <p className="text-3xl font-bold">{waiting}</p>
          <p className="text-sm text-muted">trên tổng {contracts.length} vòng hợp đồng</p>
        </Link>
        <Link href="/projects" className={`${CARD} space-y-1 p-4 hover:border-accent`}>
          <p className="text-sm text-muted">Dự án đang sản xuất</p>
          <p className="text-3xl font-bold">{producing}</p>
          <p className="text-sm text-muted">trên tổng {projects.length} dự án</p>
        </Link>
      </div>
      <section className={CARD}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <Bell className="h-4 w-4" aria-hidden="true" /> Thông báo
            {unread > 0 && <Badge tone="action">{unread} chưa đọc</Badge>}
          </h2>
          {unread > 0 && (
            <form action={markAllNotificationsRead}>
              <button type="submit" className="flex items-center gap-1 text-sm text-accent hover:underline">
                <CheckCheck className="h-4 w-4" aria-hidden="true" /> Đánh dấu đã đọc tất cả
              </button>
            </form>
          )}
        </div>
        {notifications.data.length ? (
          <ul className="divide-y divide-border">
            {notifications.data.map((item) => (
              <NotificationItem key={item.id} item={item} />
            ))}
          </ul>
        ) : (
          <div className="p-4">
            <EmptyNote>Chưa có thông báo nào.</EmptyNote>
          </div>
        )}
      </section>
    </>
  );
}

export default function OverviewPage() {
  return <Guarded load={() => Overview()} />;
}
