'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Clapperboard, FileSignature, Film, LayoutDashboard, LogOut } from 'lucide-react';
import { logout } from '@/app/actions/auth';
import { ThemeToggle } from './ThemeToggle';

export interface PortalSidebarProps {
  studioName: string;
  contactLabel?: string | null;
  waitingContracts?: number;
  producingProjects?: number;
  unreadNotifications?: number;
}

const isActive = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

const ITEM =
  'flex h-9 items-center justify-between gap-2 rounded-lg px-2.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary';

/**
 * The sidebar of Studio Web, after the inset sidebar of arhamkhnz/next-shadcn-admin-dashboard (as AI_Cinema_FE):
 * brand, the grouped menu with what waits on the studio, and the signed-in studio with sign-out at the foot.
 */
export function PortalHeader({
  studioName,
  contactLabel,
  waitingContracts = 0,
  producingProjects = 0,
  unreadNotifications = 0,
}: PortalSidebarProps) {
  const pathname = usePathname();

  const groups = [
    {
      label: 'Làm việc',
      items: [
        { href: '/', label: 'Tổng quan', ariaLabel: 'Tổng quan', icon: LayoutDashboard, badge: 0 },
        { href: '/contracts', label: 'Hợp đồng & Báo giá', ariaLabel: 'Hợp đồng', icon: FileSignature, badge: waitingContracts },
        { href: '/projects', label: 'Dự án sản xuất', ariaLabel: 'Dự án', icon: Film, badge: producingProjects },
      ],
    },
    {
      label: 'Tài khoản',
      items: [{ href: '/#notifications', label: 'Thông báo', ariaLabel: 'Thông báo', icon: Bell, badge: unreadNotifications, anchor: true }],
    },
  ];

  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 p-3 text-on-booth/90 md:sticky md:top-0 md:h-screen md:w-64">
      <div className="flex items-center justify-between gap-2 px-1">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 rounded-lg p-1">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-primary to-highlight text-on-booth shadow-lg shadow-primary/30">
            <Clapperboard className="size-4" aria-hidden="true" />
          </span>
          <span className="grid min-w-0 leading-tight">
            <span className="truncate font-display text-xl font-bold tracking-wide">AI Cinema</span>
            <span className="truncate text-xs text-on-booth/55">Studio đối tác</span>
          </span>
        </Link>
        <ThemeToggle onBooth />
      </div>

      <nav aria-label="Điều hướng" className="flex flex-1 flex-col gap-4">
        {groups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-2.5 text-xs font-medium text-on-booth/45">{group.label}</p>
            <div className="flex flex-wrap gap-1 md:flex-col">
              {group.items.map(({ href, label, ariaLabel, icon: Icon, badge, ...rest }) => {
                const active = !('anchor' in rest) && isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-label={ariaLabel}
                    aria-current={active ? 'page' : undefined}
                    className={`${ITEM} ${active ? 'bg-linear-to-r from-primary/30 to-transparent font-medium text-on-booth shadow-[inset_3px_0_0_var(--primary)]' : 'text-on-booth/65 hover:bg-on-booth/5 hover:text-on-booth'}`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Icon className={`size-4 shrink-0 ${active ? 'text-primary' : ''}`} aria-hidden="true" />
                      <span className="truncate">{label}</span>
                    </span>
                    {badge > 0 && (
                      <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground tabular-nums">{badge}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-2.5 rounded-lg p-2">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-on-booth/10 text-xs font-bold">
          {studioName.trim().charAt(0).toUpperCase() || 'S'}
        </span>
        <span className="grid min-w-0 flex-1 leading-tight">
          <span className="truncate text-sm font-medium">{studioName}</span>
          <span className="truncate text-xs text-on-booth/55">{contactLabel || 'Đối tác sản xuất'}</span>
        </span>
        <form action={logout}>
          <button
            type="submit"
            aria-label="Đăng xuất"
            title="Đăng xuất"
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-on-booth/60 transition-colors hover:bg-on-booth/10 hover:text-on-booth"
          >
            <LogOut className="size-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </aside>
  );
}
