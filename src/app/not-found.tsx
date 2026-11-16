import Link from 'next/link';
import { BUTTON, CARD } from '@/components/ui';

export const metadata = { title: 'Không tìm thấy trang - Studio Web' };

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <div className={`${CARD} space-y-4 p-7`}>
        <h1 className="text-xl font-bold tracking-tight">Không tìm thấy trang</h1>
        <p className="text-sm text-muted">Đường dẫn không tồn tại hoặc đã thay đổi. Quay về Tổng quan để tiếp tục.</p>
        <Link href="/" className={BUTTON}>
          Về Tổng quan
        </Link>
      </div>
    </main>
  );
}
