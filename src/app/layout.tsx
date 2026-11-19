import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, Big_Shoulders } from 'next/font/google';
import { ThemeProvider } from '@/components/ThemeProvider';
import './globals.css';

// Be Vietnam Pro for reading, Big Shoulders (a cinema marquee face) for titles: the type of AI_Cinema_FE.
const body = Be_Vietnam_Pro({ variable: '--font-face-body', subsets: ['latin', 'vietnamese'], weight: ['400', '500', '600', '700'], display: 'swap' });
const display = Big_Shoulders({ variable: '--font-face-display', subsets: ['latin', 'vietnamese'], weight: ['600', '700', '800'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Studio Web - AI Cinema',
  description: 'Cổng làm việc của Studio đối tác: hợp đồng, dự án, nộp phim cho Reviewer của AI Cinema.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f4fb' },
    { media: '(prefers-color-scheme: dark)', color: '#16111f' },
  ],
};

/** Applies the saved theme before the first paint, so a dark-theme studio never sees a white flash. */
const THEME_SCRIPT = `try{if(localStorage.getItem('ai_cinema_studio_theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning className={`${body.variable} ${display.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased transition-colors duration-200">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
