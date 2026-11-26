import { Film } from 'lucide-react';
import { LoginForm } from '@/components/LoginForm';
import { PosterWall } from '@/components/PosterWall';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getConfig } from '@/lib/config';

export const metadata = { title: 'Đăng nhập - Studio Web' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  const { expired } = await searchParams;
  const notice = expired ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' : undefined;
  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-foreground">
      <PosterWall />
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      <div className="relative z-10 w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card/95 p-8 shadow-2xl shadow-black/50 backdrop-blur-md">
        <div className="space-y-4 text-center">
          <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Film className="size-5" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Studio Web</h1>
            <p className="text-sm leading-relaxed text-muted">Dành cho Studio đối tác của AI Cinema</p>
          </div>
        </div>
        <LoginForm notice={notice} />
        <p className="text-center text-xs leading-relaxed text-muted">Quên mật khẩu? Liên hệ Admin AI Cinema.</p>
        <div className="border-t border-border pt-4 text-center text-sm">
          <span className="text-muted">Không phải tài khoản Studio? </span>
          <a href={getConfig().webLoginUrl} className="font-semibold text-foreground underline underline-offset-2 hover:opacity-80">
            Quay lại đăng nhập AI Cinema
          </a>
        </div>
      </div>
    </main>
  );
}
