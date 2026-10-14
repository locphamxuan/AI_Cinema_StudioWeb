import type { Metadata } from 'next';
import { AppHeader } from '@/components/AppHeader';
import './globals.css';

export const metadata: Metadata = {
  title: 'Studio đối tác — nhận đơn đặt hàng và giao phim qua email',
  description: 'Trang của Studio đối tác bên thứ 3: nhận email bàn giao của AI Cinema và gửi lại phim đã soạn sẵn.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className="min-h-screen antialiased">
        <AppHeader />
        <main className="mx-auto max-w-5xl space-y-5 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
