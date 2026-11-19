'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useStudioTheme } from './ThemeProvider';

const subscribeNoop = () => () => {};

const ON_PAGE =
  'border-border bg-subtle text-foreground hover:bg-card dark:text-highlight';
/** On the dark projection booth of the sidebar, whichever theme the page uses. */
const ON_BOOTH = 'border-on-booth/15 bg-on-booth/10 text-on-booth hover:bg-on-booth/20 dark:text-highlight';

/** Pill Light/Dark switch avoiding SSR hydration mismatch. */
export function ThemeToggle({ onBooth = false }: { onBooth?: boolean }) {
  const { theme, toggleTheme } = useStudioTheme();
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const isDark = mounted && theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Chuyển đổi giao diện sáng / tối"
      title={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
      className={`inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors ${onBooth ? ON_BOOTH : ON_PAGE}`}
    >
      {isDark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
    </button>
  );
}
