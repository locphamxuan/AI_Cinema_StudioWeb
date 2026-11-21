import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import { ThemeProvider } from '@/components/ThemeProvider';
import './globals.css';

// Be Vietnam Pro, drawn for Vietnamese, as AI_Cinema_FE.
const body = Be_Vietnam_Pro({ variable: '--font-face-body', subsets: ['latin', 'vietnamese'], weight: ['400', '500', '600', '700'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Studio Web - AI Cinema',
  description: 'Cổng làm việc của Studio đối tác: hợp đồng, dự án, nộp phim cho Reviewer của AI Cinema.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9fafb' },
    { media: '(prefers-color-scheme: dark)', color: '#090b10' },
  ],
};

/** Applies the saved theme before the first paint, so a dark-theme studio never sees a white flash. */
const THEME_SCRIPT = `try{if(localStorage.getItem('ai_cinema_studio_theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning className={body.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased transition-colors duration-200">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
