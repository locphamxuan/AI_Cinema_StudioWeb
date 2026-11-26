import Link from 'next/link';
import { CONTRACT_TABS, type ContractTab } from '@/lib/domain/contract';

const href = (tab: ContractTab, page?: number) => `/contracts?tab=${tab}${page && page > 1 ? `&page=${page}` : ''}`;

/** The sub-tabs of Hợp đồng và báo giá, each with how many items it holds. */
export function ContractTabs({ active, counts }: { active: ContractTab; counts: Record<ContractTab, number> }) {
  return (
    <nav aria-label="Nhóm hợp đồng" className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-subtle p-1">
      {CONTRACT_TABS.map(({ key, label }) => {
        const current = key === active;
        return (
          <Link
            key={key}
            href={href(key)}
            aria-current={current ? 'page' : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
              current ? 'bg-card font-semibold text-foreground shadow-xs' : 'text-muted hover:text-foreground'
            }`}
          >
            {label}
            <span
              className={`rounded px-1.5 text-xs tabular-nums ${
                current ? 'bg-primary text-primary-foreground' : 'bg-card text-muted'
              } ${key === 'todo' && counts.todo > 0 && !current ? 'bg-amber-500 text-white dark:bg-amber-400 dark:text-slate-900' : ''}`}
            >
              {counts[key]}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Previous / next links of a paged list; nothing when everything fits on one page. */
export function Pagination({ tab, page, pages }: { tab: ContractTab; page: number; pages: number }) {
  if (pages <= 1) return null;
  const link = 'rounded-md border border-border bg-card px-3 py-1.5 text-sm font-semibold hover:bg-subtle';
  return (
    <nav aria-label="Phân trang" className="flex items-center justify-between gap-3 text-sm">
      {page > 1 ? (
        <Link href={href(tab, page - 1)} className={link}>
          Trang trước
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted tabular-nums">
        Trang {page}/{pages}
      </span>
      {page < pages ? (
        <Link href={href(tab, page + 1)} className={link}>
          Trang sau
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
