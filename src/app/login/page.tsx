import { Clapperboard } from 'lucide-react';
import { LoginForm } from '@/components/LoginForm';
import { CARD } from '@/components/ui';

export const metadata = { title: 'Đăng nhập - Studio Web' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  const { expired } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6">
      <div className={`${CARD} w-full max-w-md space-y-6 p-7 shadow-sm sm:p-9`}>
        <div className="space-y-3 text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-white shadow-xs dark:text-slate-900">
            <Clapperboard className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2">
              <span className="text-lg font-extrabold tracking-tight">AI CINEMA</span>
              <span className="rounded-full border border-border bg-foreground/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">
                Studio Partner
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">Studio Web</h1>
            <p className="text-xs leading-relaxed text-muted">
              Đăng nhập bằng tài khoản Studio đối tác do AI Cinema cấp để ký hợp đồng và bàn giao phim.
            </p>
          </div>
        </div>
        <LoginForm notice={expired ? 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.' : undefined} />
      </div>
      <p className="mt-6 text-center text-[11px] text-muted">
        Cổng đối tác sản xuất bên ngoài · Tuân thủ quy trình bàn giao MF-1 &amp; Điều 44
      </p>
    </main>
  );
}
