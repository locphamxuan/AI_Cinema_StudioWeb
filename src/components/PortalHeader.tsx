'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clapperboard, FileSignature, Film, LayoutDashboard, LogOut } from 'lucide-react';
import { logout } from '@/app/actions/auth';

const LINKS = [
  { href: '/', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/contracts', label: 'Hợp đồng', icon: FileSignature },
  { href: '/projects', label: 'Dự án', icon: Film },
] as const;

const isActive = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

export function PortalHeader({ studioName }: { studioName: string }) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent text-white shadow-xs dark:text-slate-900">
            <Clapperboard className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="text-sm font-extrabold tracking-tight">AI CINEMA</span>
              <span className="rounded-full border border-border bg-foreground/5 px-2 py-0.5 text-[10px] font-semibold text-muted">
                Studio Partner
              </span>
            </span>
            <span className="block truncate text-xs font-medium text-muted">{studioName}</span>
          </span>
        </Link>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <nav aria-label="Điều hướng" className="flex items-center gap-1">
            {LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(pathname, href) ? 'page' : undefined}
                className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs sm:text-sm font-medium text-muted transition-all hover:bg-foreground/5 hover:text-foreground aria-[current=page]:bg-accent aria-[current=page]:font-semibold aria-[current=page]:text-white dark:aria-[current=page]:text-slate-900"
              >
                <Icon className="h-4 w-4" aria-hidden="true" /> {label}
              </Link>
            ))}
          </nav>
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-xs sm:text-sm font-medium text-muted transition-all hover:bg-foreground/5 hover:text-foreground"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" /> Đăng xuất
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
