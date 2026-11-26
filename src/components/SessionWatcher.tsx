'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface SessionWatcherProps {
  /** The account this page was rendered for; null for a session older than the account cookie. */
  accountId: string | null;
  /** Name of the readable cookie holding the signed-in account id (COOKIE.account). */
  cookieName: string;
}

function cookieValue(name: string): string | null {
  const entry = document.cookie.split('; ').find((part) => part.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null;
}

/**
 * The windows of one browser share the studio session cookies: a login or logout in one window changes the account
 * of all of them. When this window comes back to the front with another account (or none), it reloads for that
 * account and says so, instead of acting for the previous studio with the new one's session.
 */
export function SessionWatcher({ accountId, cookieName }: SessionWatcherProps) {
  const router = useRouter();
  const [switched, setSwitched] = useState(false);

  useEffect(() => {
    if (!accountId) return;
    const check = () => {
      if (document.visibilityState === 'hidden') return;
      const now = cookieValue(cookieName);
      if (now === accountId) return;
      if (!now) {
        router.replace('/login');
        return;
      }
      setSwitched(true);
      router.refresh();
    };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [accountId, cookieName, router]);

  if (!switched) return null;
  return (
    <div role="status" className="mx-auto mb-4 flex max-w-6xl items-start justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
      <span>
        Một cửa sổ khác của trình duyệt này vừa đăng nhập tài khoản Studio khác, nên trang đã chuyển sang tài khoản đó.
        Mỗi trình duyệt chỉ giữ một tài khoản Studio; muốn dùng song song, hãy mở tài khoản kia trong cửa sổ ẩn danh
        hoặc hồ sơ Chrome khác.
      </span>
      <button type="button" onClick={() => setSwitched(false)} className="shrink-0 font-semibold underline">
        Đã hiểu
      </button>
    </div>
  );
}
