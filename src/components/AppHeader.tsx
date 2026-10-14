import Link from 'next/link';
import { Clapperboard, Inbox, Library, Send } from 'lucide-react';
import { getConfig } from '@/lib/config';

const LINKS = [
  { href: '/', label: 'Hộp thư đến', icon: Inbox },
  { href: '/library', label: 'Phim soạn sẵn', icon: Library },
  { href: '/sent', label: 'Đã gửi', icon: Send },
] as const;

/** The studio's own site: its name and the three places it works in. Not an AI Cinema screen. */
export function AppHeader() {
  const { fromName } = getConfig();
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <Clapperboard className="h-5 w-5 text-accent" aria-hidden="true" />
          {fromName}
        </Link>
        <nav aria-label="Điều hướng" className="flex gap-1 text-sm">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 hover:bg-foreground/5">
              <Icon className="h-4 w-4" aria-hidden="true" /> {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
