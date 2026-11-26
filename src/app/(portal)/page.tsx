import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ContractProgress, StatTiles } from '@/components/DashboardStats';
import { NotificationList } from '@/components/NotificationList';
import { ProfileNotice } from '@/components/ProfileNotice';
import { Badge, BUTTON, CARD, Facts, Guarded } from '@/components/ui';
import { groupByProject, tabOfProject } from '@/lib/domain/contract';
import { PROJECT_STATUS_LABEL } from '@/lib/domain/episode';
import { formatDateTime, formatVnd } from '@/lib/format';
import {
  loadContracts,
  loadNotifications,
  loadProfile,
  loadProjects,
  loadStudio,
  loadUnreadCount,
} from '@/lib/session/portal-data';

export const metadata = { title: 'Tổng quan - Studio Web' };

async function Overview({ notificationPage }: { notificationPage: number }) {
  const [studio, contracts, projects, notifications, { unread }, profile] = await Promise.all([
    loadStudio(),
    loadContracts(),
    loadProjects(),
    loadNotifications(notificationPage),
    loadUnreadCount(),
    loadProfile(),
  ]);
  const groups = groupByProject(contracts);
  const count = (tab: ReturnType<typeof tabOfProject>) => groups.filter((group) => tabOfProject(group) === tab).length;
  const [todo, waiting, signed] = [count('todo'), count('waiting'), count('signed')];
  const producingList = projects.filter((project) => project.status === 'IN_PRODUCTION');
  const heroProject = producingList[0] ?? projects[0] ?? null;
  const signedValueVnd = contracts
    .filter((contract) => contract.status === 'SIGNED')
    .reduce((sum, contract) => sum + (contract.costVnd ?? 0), 0);

  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">Xin chào, {studio.name}</h1>
          <p className="text-sm text-muted">
            {todo
              ? `Có ${todo} hợp đồng đang chờ Studio ký.`
              : 'Theo dõi hợp đồng, hạn giao từng tập và yêu cầu sửa từ Reviewer của AI Cinema.'}
          </p>
        </div>
        {todo > 0 && (
          <Link href="/contracts?tab=todo" className={BUTTON}>
            Mở hợp đồng cần ký
          </Link>
        )}
      </section>

      {!profile.complete && <ProfileNotice missing={profile.missing} />}

      <StatTiles
        tiles={[
          { stage: 'todo', label: 'Cần Studio ký', value: todo, note: `trên tổng ${groups.length} dự án có hợp đồng`, href: '/contracts?tab=todo' },
          { stage: 'waiting', label: 'Chờ Admin ký', value: waiting, note: 'Studio đã ký, chờ AI Cinema', href: '/contracts?tab=waiting' },
          { stage: 'signed', label: 'Đã ký đủ', value: signed, note: 'Hợp đồng có đủ chữ ký hai bên', href: '/contracts?tab=signed' },
          {
            stage: 'producing',
            label: 'Đang sản xuất',
            value: producingList.length,
            note: producingList[0] ? `Đang chạy: ${producingList[0].title}` : `trên tổng ${projects.length} dự án`,
            href: '/projects',
          },
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <ContractProgress
          signedValueVnd={signedValueVnd}
          parts={[
            { stage: 'todo', label: 'Cần Studio ký', value: todo },
            { stage: 'waiting', label: 'Chờ Admin ký', value: waiting },
            { stage: 'signed', label: 'Đã ký đủ', value: signed },
          ]}
        />
        <section id="studio-profile" className={`${CARD} space-y-3 p-5`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold">Thông tin pháp nhân</h2>
            {profile.complete ? <Badge tone="done">Đủ để ký</Badge> : <Badge tone="action">Còn thiếu</Badge>}
          </div>
          <Facts
            items={[
              ['Email', studio.email ?? '-'],
              ['Người đại diện', studio.contactName ?? '-'],
              ['Mã số thuế', profile.taxCode ?? 'Chưa điền'],
            ]}
          />
          <Link href="/profile" className="inline-block text-sm font-semibold underline underline-offset-2">
            Xem hồ sơ pháp lý
          </Link>
        </section>
      </div>

      {heroProject && (
        <section className="flex flex-col justify-between gap-5 rounded-xl bg-primary p-6 text-primary-foreground shadow-lg shadow-primary/20 sm:flex-row sm:items-center sm:p-7">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-md bg-primary-foreground/15 px-2.5 py-1 text-[11px] font-semibold">
              <span className="size-2 rounded-full bg-primary-foreground" aria-hidden="true" />
              {PROJECT_STATUS_LABEL[heroProject.status] ?? heroProject.status}
            </span>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Dự án: {heroProject.title}
            </h2>
            <p className="text-xs opacity-85 sm:text-sm">
              {heroProject.episodeCount} tập
              {heroProject.contract?.costVnd != null ? ` • Giá trị hợp đồng: ${formatVnd(heroProject.contract.costVnd)}` : ''}
              {heroProject.handedOffAt ? ` • Nhận việc: ${formatDateTime(heroProject.handedOffAt)}` : ''}
            </p>
          </div>
          <Link
            href={`/projects/${heroProject.id}`}
            className="inline-flex h-9 shrink-0 items-center gap-2 self-start rounded-lg bg-primary-foreground px-4 text-sm font-semibold text-primary transition-opacity hover:opacity-90 sm:self-center"
          >
            Mở dự án <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
      )}

      <NotificationList notifications={notifications} unread={unread} />
    </>
  );
}

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ notificationPage?: string }> }) {
  const page = Math.floor(Number((await searchParams).notificationPage ?? 1));
  return <Guarded load={() => Overview({ notificationPage: Number.isFinite(page) && page > 1 ? page : 1 })} />;
}
