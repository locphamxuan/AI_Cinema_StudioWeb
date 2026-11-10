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

export function PortalHeader({
  studioName,
  contactLabel,
  waitingContracts = 0,
  producingProjects = 0,
  unreadNotifications = 0,
}: PortalSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Tổng quan', ariaLabel: 'Tổng quan', icon: LayoutDashboard, badge: 0 },
    { href: '/contracts', label: 'Hợp đồng & Báo giá', ariaLabel: 'Hợp đồng', icon: FileSignature, badge: waitingContracts },
    { href: '/projects', label: 'Dự án sản xuất', ariaLabel: 'Dự án', icon: Film, badge: producingProjects },
    { href: '/#notifications', label: 'Trung tâm thông báo', ariaLabel: 'Thông báo', icon: Bell, badge: unreadNotifications, anchor: true },
  ];

  return (
    <aside className="w-full shrink-0 border-b border-slate-200/80 bg-white p-4 text-slate-900 dark:border-white/[0.08] dark:bg-[#0D1017] dark:text-slate-100 md:sticky md:top-0 md:flex md:h-screen md:w-64 md:flex-col md:justify-between md:border-r md:border-b-0 md:p-6">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#121212] text-white shadow-xs dark:bg-white dark:text-slate-900">
              <Clapperboard className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">
                AI CINEMA
              </span>
              <span className="inline-block rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
                Studio Partner
              </span>
            </span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-slate-50 p-3 dark:border-white/10 dark:bg-slate-900/60">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#121212] text-xs font-bold text-white dark:bg-white dark:text-slate-900">
            {studioName.trim().charAt(0).toUpperCase() || 'S'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{studioName}</p>
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
              {contactLabel || 'Đối tác sản xuất'}
            </p>
          </div>
        </div>

        <nav aria-label="Điều hướng" className="flex flex-wrap gap-1.5 md:flex-col md:gap-1">
          {navItems.map(({ href, label, ariaLabel, icon: Icon, badge, anchor }) => {
            const active = !anchor && isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-label={ariaLabel}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center justify-between gap-2 rounded-full px-4 py-2 text-xs font-medium transition-all sm:text-sm ${
                  active
                    ? 'bg-[#121212] font-semibold text-white shadow-xs dark:bg-white dark:text-slate-900'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">{label}</span>
                </span>
                {badge > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
                      active
                        ? 'bg-white/20 text-white dark:bg-slate-900/15 dark:text-slate-900'
                        : 'bg-slate-200/80 text-slate-700 dark:bg-white/10 dark:text-slate-200'
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-4 border-t border-slate-200/80 pt-4 dark:border-white/[0.08] md:mt-0">
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 sm:text-sm"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" /> Đăng xuất
          </button>
        </form>
      </div>
    </aside>
  );
}
