'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { RefreshCw } from 'lucide-react';

/** Reads the mailbox again: new hand-off mails show up without leaving the page. */
export function RefreshButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => start(() => router.refresh())}
      disabled={pending}
      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-foreground/5 disabled:opacity-50"
    >
      <RefreshCw className={`h-4 w-4 ${pending ? 'animate-spin' : ''}`} aria-hidden="true" /> Làm mới
    </button>
  );
}
