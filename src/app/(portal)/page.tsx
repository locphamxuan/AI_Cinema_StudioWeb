import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Bell, Building2, CheckCheck, Clock, FileSignature, Film } from 'lucide-react';
import { markAllNotificationsRead } from '@/app/actions/notifications';
import { Badge, CARD, EmptyNote, Facts, Guarded } from '@/components/ui';
import { needsStudio } from '@/lib/domain/contract';
import { PROJECT_STATUS_LABEL } from '@/lib/domain/episode';
import { formatDateTime, formatVnd } from '@/lib/format';
import { pagePortal } from '@/lib/session/server';
import type { PortalNotification } from '@/lib/api/types';

export const metadata = { title: 'Tổng quan - Studio Web' };

function NotificationItem({ item }: { item: PortalNotification }) {
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
          <p className={`text-sm ${item.readAt ? 'text-slate-800 dark:text-slate-200' : 'font-bold text-slate-900 dark:text-white'}`}>
            {item.title}
          </p>
          <span className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(item.createdAt)}</span>
        </div>
        {item.body && <p className="whitespace-pre-line text-xs sm:text-sm text-slate-600 dark:text-slate-300">{item.body}</p>}
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
  const producingList = projects.filter((project) => project.status === 'IN_PRODUCTION');
  const producing = producingList.length;
  const heroProject = producingList[0] ?? projects[0] ?? null;
  const unread = notifications.data.filter((item) => !item.readAt).length;

  return (
    <>
      <section className={`${CARD} flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center`}>
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Xin chào, {studio.name}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Theo dõi hợp đồng sản xuất, tiến độ phân cảnh và yêu cầu kiểm duyệt từ AI Cinema.
          </p>
        </div>
        <Link
          href={heroProject ? `/projects/${heroProject.id}` : '/projects'}
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-[#121212] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 sm:self-center"
        >
          Mở dự án &amp; Nộp phim <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>

      <div className="grid gap-5 md:grid-cols-3">
        <section id="studio-profile" className={`${CARD} space-y-3.5 p-6`}>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Building2 className="h-4 w-4 text-slate-900 dark:text-white" aria-hidden="true" />
            <h2>Thông tin pháp nhân</h2>
          </div>
          <Facts
            items={[
              ['Tên Studio', studio.name],
              ['Email', studio.email ?? '-'],
              ['Người liên hệ', studio.contactName ?? '-'],
              ['Điện thoại', studio.phone ?? '-'],
            ]}
          />
        </section>

        <Link
          href="/contracts"
          className={`${CARD} group flex flex-col justify-between space-y-3 p-6 transition-all hover:-translate-y-0.5 hover:shadow-md`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Hợp đồng chờ Studio xử lý
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-800 transition-colors group-hover:bg-[#121212] group-hover:text-white dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:group-hover:bg-white dark:group-hover:text-slate-900">
              <FileSignature className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
          <div>
            <p className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">{waiting}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">trên tổng {contracts.length} vòng hợp đồng</p>
          </div>
        </Link>

        <Link
          href="/projects"
          className={`${CARD} group flex flex-col justify-between space-y-3 p-6 transition-all hover:-translate-y-0.5 hover:shadow-md`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Dự án đang sản xuất
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-800 transition-colors group-hover:bg-[#121212] group-hover:text-white dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:group-hover:bg-white dark:group-hover:text-slate-900">
              <Film className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
          <div>
            <p className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">{producing}</p>
            <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
              {producingList[0] ? `Đang chạy: ${producingList[0].title}` : `trên tổng ${projects.length} dự án`}
            </p>
          </div>
        </Link>
      </div>

      {heroProject && (
        <section className="flex flex-col justify-between gap-5 rounded-3xl border border-slate-800 bg-[#12151E] p-6 text-white shadow-md dark:border-white/10 dark:bg-black/80 sm:flex-row sm:items-center sm:p-7">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold text-emerald-300 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 dark:bg-emerald-400" aria-hidden="true" />
              {PROJECT_STATUS_LABEL[heroProject.status] ?? heroProject.status}
            </span>
            <h2 className="text-xl font-extrabold tracking-tight text-white dark:text-white sm:text-2xl">
              Dự án: {heroProject.title}
            </h2>
            <p className="text-xs text-slate-300 sm:text-sm">
              {heroProject.episodeCount} tập
              {heroProject.contract?.costVnd != null ? ` • Giá trị HĐ: ${formatVnd(heroProject.contract.costVnd)}` : ''}
              {heroProject.handedOffAt ? ` • Bàn giao: ${formatDateTime(heroProject.handedOffAt)}` : ''}
            </p>
          </div>
          <Link
            href={`/projects/${heroProject.id}`}
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-slate-900 shadow-xs transition-all hover:bg-slate-100 dark:bg-white dark:text-slate-900 sm:self-center sm:text-sm"
          >
            Nộp phim ngay <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
      )}

      <section id="notifications" className={`${CARD} p-6`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-white/[0.06]">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            <Bell className="h-4 w-4" aria-hidden="true" /> Thông báo
            {unread > 0 && <Badge tone="action">{unread} chưa đọc</Badge>}
          </h2>
          {unread > 0 && (
            <form action={markAllNotificationsRead}>
              <button
                type="submit"
                className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-white"
              >
                <CheckCheck className="h-4 w-4" aria-hidden="true" /> Đánh dấu đã đọc tất cả
              </button>
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
          <EmptyNote>Chưa có thông báo nào.</EmptyNote>
        )}
      </section>
    </>
  );
}

export default function OverviewPage() {
  return <Guarded load={() => Overview()} />;
}
