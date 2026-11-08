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

export const isActive = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

export function PortalHeader({ studioName }: { studioName: string }) {
  const pathname = usePathname();
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex min-w-0 items-center gap-2 font-bold">
          <Clapperboard className="h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
          <span className="truncate">{studioName}</span>
        </Link>
        <div className="flex flex-wrap items-center gap-1 text-sm">
          <nav aria-label="Điều hướng" className="flex gap-1">
            {LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(pathname, href) ? 'page' : undefined}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 hover:bg-foreground/5 aria-[current=page]:bg-accent/10 aria-[current=page]:font-semibold aria-[current=page]:text-accent"
              >
                <Icon className="h-4 w-4" aria-hidden="true" /> {label}
              </Link>
            ))}
          </nav>
          <form action={logout}>
            <button type="submit" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-muted hover:bg-foreground/5">
              <LogOut className="h-4 w-4" aria-hidden="true" /> Đăng xuất
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
