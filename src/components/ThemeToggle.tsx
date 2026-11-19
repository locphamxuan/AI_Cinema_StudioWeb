'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useStudioTheme } from './ThemeProvider';

const subscribeNoop = () => () => {};

/** Pill Light/Dark switch avoiding SSR hydration mismatch. */
export function ThemeToggle() {
  const { theme, toggleTheme } = useStudioTheme();
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const isDark = mounted && theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Chuyển đổi giao diện sáng / tối"
      title={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
      className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-slate-800 transition-all hover:bg-slate-200 dark:border-white/10 dark:bg-slate-800 dark:text-amber-400 dark:hover:bg-slate-700"
    >
      {isDark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
    </button>
  );
}
