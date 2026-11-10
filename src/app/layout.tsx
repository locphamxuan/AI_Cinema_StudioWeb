import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Studio Web - AI Cinema',
  description: 'Cổng làm việc của Studio đối tác: hợp đồng, dự án, nộp phim cho Reviewer của AI Cinema.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
