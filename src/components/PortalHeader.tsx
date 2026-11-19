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
    <aside className="flex w-full shrink-0 flex-col gap-4 p-3 text-foreground md:sticky md:top-0 md:h-screen md:w-64">
      <div className="flex items-center justify-between gap-2 px-1">
        <Link href="/" className="flex min-w-0 items-center gap-2.5 rounded-lg p-1">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Clapperboard className="size-4" aria-hidden="true" />
          </span>
          <span className="grid min-w-0 leading-tight">
            <span className="truncate text-sm font-bold tracking-tight">AI Cinema</span>
            <span className="truncate text-xs text-muted">Studio đối tác</span>
          </span>
        </Link>
        <ThemeToggle />
      </div>

      <nav aria-label="Điều hướng" className="flex flex-1 flex-col gap-4">
        {groups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-2.5 text-xs font-medium text-muted">{group.label}</p>
            <div className="flex flex-wrap gap-1 md:flex-col">
              {group.items.map(({ href, label, ariaLabel, icon: Icon, badge, ...rest }) => {
                const active = !('anchor' in rest) && isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-label={ariaLabel}
                    aria-current={active ? 'page' : undefined}
                    className={`${ITEM} ${active ? 'bg-primary/10 font-medium text-primary shadow-[inset_3px_0_0_var(--primary)]' : 'text-muted hover:bg-card/70 hover:text-foreground'}`}
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
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-subtle text-xs font-bold">
          {studioName.trim().charAt(0).toUpperCase() || 'S'}
        </span>
        <span className="grid min-w-0 flex-1 leading-tight">
          <span className="truncate text-sm font-medium">{studioName}</span>
          <span className="truncate text-xs text-muted">{contactLabel || 'Đối tác sản xuất'}</span>
        </span>
        <form action={logout}>
          <button
            type="submit"
            aria-label="Đăng xuất"
            title="Đăng xuất"
            className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-card hover:text-foreground"
          >
            <LogOut className="size-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </aside>
  );
}
