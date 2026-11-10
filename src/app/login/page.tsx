import { Clapperboard } from 'lucide-react';
import { LoginForm } from '@/components/LoginForm';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CARD } from '@/components/ui';

export const metadata = { title: 'Đăng nhập - Studio Web' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  const { expired } = await searchParams;
  return (
    <main className="relative mx-auto flex min-h-screen flex-col items-center justify-center bg-[#F9FAFB] px-4 py-12 text-slate-900 dark:bg-[#090B10] dark:text-slate-100 sm:px-6">
      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>
      <div className={`${CARD} w-full max-w-md space-y-6 p-7 shadow-sm sm:p-9`}>
        <div className="space-y-3 text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#121212] text-white shadow-xs dark:bg-white dark:text-slate-900">
            <Clapperboard className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2">
              <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">AI CINEMA</span>
              <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
                Studio Partner
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Studio Web</h1>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Đăng nhập bằng tài khoản Studio đối tác do AI Cinema cấp để ký hợp đồng và bàn giao phim.
            </p>
          </div>
        </div>
        <LoginForm notice={expired ? 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.' : undefined} />
      </div>
      <p className="mt-6 text-center text-[11px] text-slate-500 dark:text-slate-400">
        Cổng đối tác sản xuất bên ngoài · Tuân thủ quy trình bàn giao MF-1 &amp; Điều 44
      </p>
    </main>
  );
}
