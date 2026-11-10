import Link from 'next/link';
import { ArrowUpRight, Bell, Building2, CheckCheck, Clock, FileSignature, Film } from 'lucide-react';
import { markAllNotificationsRead } from '@/app/actions/notifications';
import { Badge, BUTTON_GHOST, CARD, EmptyNote, Facts, Guarded, PageTitle } from '@/components/ui';
import { needsStudio } from '@/lib/domain/contract';
import { formatDateTime } from '@/lib/format';
import { pagePortal } from '@/lib/session/server';
import type { PortalNotification } from '@/lib/api/types';

export const metadata = { title: 'Tổng quan - Studio Web' };

function NotificationItem({ item }: { item: PortalNotification }) {
  return (
    <li className="flex items-start gap-3.5 px-6 py-4 transition-colors hover:bg-foreground/[0.02]">
      <span
        className={`mt-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
          item.readAt
            ? 'border-border bg-background text-muted'
            : 'border-accent/20 bg-accent text-white dark:text-slate-900'
        }`}
        aria-hidden="true"
      >
        <Clock className="h-3 w-3" />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p className={`text-sm ${item.readAt ? 'text-foreground' : 'font-semibold text-foreground'}`}>{item.title}</p>
        {item.body && <p className="whitespace-pre-line text-sm text-muted">{item.body}</p>}
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
      <PageTitle title={`Xin chào, ${studio.name}`} description="Theo dõi hợp đồng, tiến độ dự án và thông báo từ AI Cinema.">
        <Link href="/projects" className={BUTTON_GHOST}>
          Quản lý dự án <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </PageTitle>

      <div className="grid gap-5 md:grid-cols-3">
        <section className={`${CARD} space-y-3.5 p-6`}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
            <Building2 className="h-4 w-4 text-foreground" aria-hidden="true" />
            <h2>Thông tin Studio</h2>
          </div>
          <Facts
            items={[
              ['Tên', studio.name],
              ['Email', studio.email ?? '-'],
              ['Người liên hệ', studio.contactName ?? '-'],
              ['Điện thoại', studio.phone ?? '-'],
            ]}
          />
        </section>

        <Link href="/contracts" className={`${CARD} group flex flex-col justify-between space-y-3 p-6 transition-all hover:-translate-y-0.5 hover:shadow-md`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Hợp đồng chờ Studio xử lý</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors group-hover:bg-accent group-hover:text-white dark:group-hover:text-slate-900">
              <FileSignature className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
          <div>
            <p className="text-4xl font-extrabold tracking-tight">{waiting}</p>
            <p className="mt-1 text-xs text-muted">trên tổng {contracts.length} vòng hợp đồng</p>
          </div>
        </Link>

        <Link href="/projects" className={`${CARD} group flex flex-col justify-between space-y-3 p-6 transition-all hover:-translate-y-0.5 hover:shadow-md`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Dự án đang sản xuất</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors group-hover:bg-accent group-hover:text-white dark:group-hover:text-slate-900">
              <Film className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
          <div>
            <p className="text-4xl font-extrabold tracking-tight">{producing}</p>
            <p className="mt-1 text-xs text-muted">trên tổng {projects.length} dự án</p>
          </div>
        </Link>
      </div>

      <section className={`${CARD} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Bell className="h-4 w-4" aria-hidden="true" /> Trung tâm thông báo
            {unread > 0 && <Badge tone="action">{unread} chưa đọc</Badge>}
          </h2>
          {unread > 0 && (
            <form action={markAllNotificationsRead}>
              <button type="submit" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-foreground hover:underline">
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
          <div className="p-6">
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
