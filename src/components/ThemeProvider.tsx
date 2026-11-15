'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type StudioTheme = 'light' | 'dark';

const STORAGE_KEY = 'ai_cinema_studio_theme';

interface ThemeContextValue {
  theme: StudioTheme;
  toggleTheme: () => void;
  setTheme: (next: StudioTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
});

function readStoredTheme(): StudioTheme {
  if (typeof window === 'undefined') return 'light';
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<StudioTheme>(() => readStoredTheme());

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  const setTheme = (next: StudioTheme) => setThemeState(next);
  const toggleTheme = () => setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useStudioTheme = () => useContext(ThemeContext);
