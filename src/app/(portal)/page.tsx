import Link from 'next/link';
import { ArrowRight, Bell, Building2, CheckCheck, Clock, FileSignature, Film } from 'lucide-react';
import { markAllNotificationsRead } from '@/app/actions/notifications';
import { Badge, CARD, EmptyNote, Facts, Guarded } from '@/components/ui';
import { needsStudio } from '@/lib/domain/contract';
import { PROJECT_STATUS_LABEL } from '@/lib/domain/episode';
import { formatDateTime, formatVnd } from '@/lib/format';
import { loadContracts, loadNotifications, loadProjects, loadStudio } from '@/lib/session/portal-data';
import type { PortalNotification } from '@/lib/api/types';

export const metadata = { title: 'Tổng quan - Studio Web' };

function NotificationItem({ item }: { item: PortalNotification }) {
  return (
    <li className="mb-2.5 flex items-start gap-3 rounded-2xl border border-slate-100 p-4 transition-all hover:bg-slate-50 dark:border-on-booth/[0.06] dark:hover:bg-slate-900/40">
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
          item.readAt
            ? 'bg-slate-100 text-slate-500 dark:bg-on-booth/[0.06] dark:text-slate-400'
            : 'bg-[#121212] text-on-booth dark:bg-on-booth dark:text-slate-900'
        }`}
        aria-hidden="true"
      >
        <Clock className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className={`text-sm ${item.readAt ? 'text-slate-800 dark:text-slate-200' : 'font-bold text-slate-900 dark:text-on-booth'}`}>
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
  const [studio, contracts, projects, notifications] = await Promise.all([
    loadStudio(),
    loadContracts(),
    loadProjects(),
    loadNotifications(),
  ]);
  const waiting = contracts.filter(needsStudio).length;
  const producingList = projects.filter((project) => project.status === 'IN_PRODUCTION');
  const producing = producingList.length;
  const heroProject = producingList[0] ?? projects[0] ?? null;
  const unread = notifications.data.filter((item) => !item.readAt).length;

  return (
    <>
      <section className={`${CARD} space-y-1 p-6`}>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          Xin chào, {studio.name}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {waiting
            ? `Có ${waiting} vòng hợp đồng đang chờ Studio ký. Mở Hợp đồng để xử lý.`
            : 'Theo dõi hợp đồng, hạn giao từng tập và yêu cầu sửa của Reviewer AI Cinema.'}
        </p>
      </section>

      <div className="grid gap-5 md:grid-cols-3">
        <section id="studio-profile" className={`${CARD} space-y-3.5 p-6`}>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <Building2 className="h-4 w-4 text-slate-900 dark:text-on-booth" aria-hidden="true" />
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
          className={`${CARD} group flex flex-col justify-between space-y-3 bg-linear-to-t from-primary/5 to-card p-6 transition-shadow hover:shadow-md`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Hợp đồng chờ Studio xử lý
            </span>
            <span className="flex size-7 items-center justify-center rounded-lg border bg-subtle text-muted transition-colors group-hover:text-primary">
              <FileSignature className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
          <div>
            <p className="font-display text-5xl leading-none font-bold tabular-nums text-primary">{waiting}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">trên tổng {contracts.length} vòng hợp đồng</p>
          </div>
        </Link>

        <Link
          href="/projects"
          className={`${CARD} group flex flex-col justify-between space-y-3 bg-linear-to-t from-primary/5 to-card p-6 transition-shadow hover:shadow-md`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Dự án đang sản xuất
            </span>
            <span className="flex size-7 items-center justify-center rounded-lg border bg-subtle text-muted transition-colors group-hover:text-primary">
              <Film className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
          <div>
            <p className="font-display text-5xl leading-none font-bold tabular-nums text-primary">{producing}</p>
            <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
              {producingList[0] ? `Đang chạy: ${producingList[0].title}` : `trên tổng ${projects.length} dự án`}
            </p>
          </div>
        </Link>
      </div>

      {heroProject && (
        <section aria-label="Dự án đang sản xuất" className="overflow-hidden rounded-xl shadow-xl shadow-black/25">
          <div className="clapper-sticks h-7" aria-hidden="true" />
          <div className="clapper-board grid gap-0 sm:grid-cols-[1fr_auto]">
            <div className="grid grid-cols-2 sm:grid-cols-4">
              <div className="clapper-field col-span-2 border-b p-5 sm:col-span-4">
                <p className="text-xs text-on-booth/60">Phim · {PROJECT_STATUS_LABEL[heroProject.status] ?? heroProject.status}</p>
                <h2 className="mt-1 font-display text-4xl leading-none font-bold tracking-wide sm:text-5xl">{heroProject.title}</h2>
              </div>
              <ClapperField label="Số tập" value={`${heroProject.episodeCount}`} />
              <ClapperField label="Giá trị hợp đồng" value={heroProject.contract?.costVnd != null ? formatVnd(heroProject.contract.costVnd) : 'Chưa ký'} />
              <ClapperField label="Bàn giao" value={heroProject.handedOffAt ? formatDateTime(heroProject.handedOffAt) : 'Chưa bàn giao'} wide />
            </div>
            <div className="clapper-field flex items-center border-t p-5 sm:border-t-0 sm:border-l">
              <Link
                href={`/projects/${heroProject.id}`}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-highlight px-6 text-sm font-semibold text-[#1c1830] shadow-lg shadow-black/30 transition-transform hover:-translate-y-0.5"
              >
                Mở dự án <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      )}

      <section id="notifications" className={`${CARD} scroll-mt-6 p-6`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-on-booth/[0.06]">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-on-booth">
            <Bell className="h-4 w-4" aria-hidden="true" /> Thông báo
            {unread > 0 && <Badge tone="action">{unread} chưa đọc</Badge>}
          </h2>
          {unread > 0 && (
            <form action={markAllNotificationsRead}>
              <button
                type="submit"
                className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-on-booth"
              >
                <CheckCheck className="h-4 w-4" aria-hidden="true" /> Đánh dấu tất cả đã đọc
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
          <EmptyNote>Chưa có thông báo. Khi Admin hoặc Reviewer cập nhật hợp đồng hay bản phim, thông báo sẽ hiện ở đây.</EmptyNote>
        )}
      </section>
    </>
  );
}

export default function OverviewPage() {
  return <Guarded load={() => Overview()} />;
}

/** One chalk field of the clapperboard: what it is, then the value in the marquee face. */
function ClapperField({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`clapper-field border-r border-b p-5 last:border-r-0 ${wide ? 'col-span-2' : ''}`}>
      <p className="text-xs text-on-booth/60">{label}</p>
      <p className="mt-1 font-display text-2xl leading-none font-bold tracking-wide text-highlight tabular-nums">{value}</p>
    </div>
  );
}
