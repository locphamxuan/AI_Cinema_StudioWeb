import Link from 'next/link';

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
      <span className={`mt-1.5 size-2 shrink-0 rounded-full ${item.readAt ? 'bg-border' : 'bg-amber-500 dark:bg-amber-400'}`} aria-hidden="true" />
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
          Thông báo
          {unread > 0 && <Badge tone="action">{unread} chưa đọc</Badge>}
        </h2>
        {unread > 0 && (
          <form action={markAllNotificationsRead}>
            <PendingButton
              pendingLabel="Đang đánh dấu…"
              className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-white"
            >
              Đánh dấu tất cả đã đọc
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
            : 'Chưa có thông báo.'}
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
