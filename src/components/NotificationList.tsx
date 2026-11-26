import Link from 'next/link';
import { Bell, CheckCheck, Clock } from 'lucide-react';
import { markAllNotificationsRead, openNotification } from '@/app/actions/notifications';
import type { Paginated, PortalNotification } from '@/lib/api/types';
import { portalPath } from '@/lib/domain/notification';
import { formatDateTime } from '@/lib/format';
import { PendingButton } from './PendingButton';
import { Badge, CARD, EmptyNote } from './ui';

function NotificationItem({ item }: { item: PortalNotification }) {
  const target = portalPath(item.link);
  const title = (
    <span className={`text-sm ${item.readAt ? 'text-slate-800 dark:text-slate-200' : 'font-bold text-slate-900 dark:text-white'}`}>
      {item.title}
    </span>
  );
  return (
    <li className="mb-2.5 flex items-start gap-3 rounded-2xl border border-slate-100 p-4 transition-all hover:bg-slate-50 dark:border-white/[0.06] dark:hover:bg-slate-900/40">
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
          item.readAt
            ? 'bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400'
            : 'bg-[#121212] text-white dark:bg-white dark:text-slate-900'
        }`}
        aria-hidden="true"
      >
        <Clock className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          {title}
          <span className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(item.createdAt)}</span>
        </div>
        {item.body && <p className="whitespace-pre-line text-xs sm:text-sm text-slate-600 dark:text-slate-300">{item.body}</p>}
        {target && (
          <form action={openNotification}>
            <input type="hidden" name="notificationId" value={item.id} />
            <input type="hidden" name="link" value={target} />
            <PendingButton pendingLabel="Đang mở…" className="cursor-pointer text-xs font-semibold underline underline-offset-2 hover:opacity-80">
              Xem chi tiết
            </PendingButton>
          </form>
        )}
      </div>
    </li>
  );
}

const pageHref = (page: number) => (page > 1 ? `/?notificationPage=${page}#notifications` : '/#notifications');

/** The studio's notifications, newest first, a page at a time; each opens the page it is about. */
export function NotificationList({ notifications, unread }: { notifications: Paginated<PortalNotification>; unread: number }) {
  const page = notifications.meta?.currentPage ?? 1;
  const pages = notifications.meta?.totalPages ?? 1;
  const link = 'rounded-md border border-border bg-card px-3 py-1.5 text-sm font-semibold hover:bg-subtle';
  return (
    <section id="notifications" className={`${CARD} scroll-mt-6 p-6`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-white/[0.06]">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
          <Bell className="h-4 w-4" aria-hidden="true" /> Thông báo
          {unread > 0 && <Badge tone="action">{unread} chưa đọc</Badge>}
        </h2>
        {unread > 0 && (
          <form action={markAllNotificationsRead}>
            <PendingButton
              pendingLabel="Đang đánh dấu…"
              className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-white"
            >
              <CheckCheck className="h-4 w-4" aria-hidden="true" /> Đánh dấu tất cả đã đọc
            </PendingButton>
          </form>
        )}
      </div>
      {notifications.data.length ? (
        <ul>
          {notifications.data.map((item) => (
            <NotificationItem key={item.id} item={item} />
          ))}
        </ul>
      ) : (
        <EmptyNote>
          {page > 1
            ? 'Trang này không còn thông báo nào.'
            : 'Chưa có thông báo. Khi Admin hoặc Reviewer cập nhật hợp đồng hay bản phim, thông báo sẽ hiện ở đây.'}
        </EmptyNote>
      )}
      {(pages > 1 || page > 1) && (
        <nav aria-label="Phân trang thông báo" className="mt-4 flex items-center justify-between gap-3 text-sm">
          {page > 1 ? <Link href={pageHref(page - 1)} className={link}>Trang trước</Link> : <span />}
          <span className="text-muted tabular-nums">
            Trang {page}/{Math.max(pages, page)}
          </span>
          {page < pages ? <Link href={pageHref(page + 1)} className={link}>Trang sau</Link> : <span />}
        </nav>
      )}
    </section>
  );
}
