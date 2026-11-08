import { Clapperboard } from 'lucide-react';
import { LoginForm } from '@/components/LoginForm';
import { CARD } from '@/components/ui';

export const metadata = { title: 'Đăng nhập - Studio Web' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  const { expired } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <div className={`${CARD} space-y-5 p-6 shadow-sm`}>
        <div className="space-y-1 text-center">
          <Clapperboard className="mx-auto h-8 w-8 text-accent" aria-hidden="true" />
          <h1 className="text-xl font-bold">Studio Web</h1>
          <p className="text-sm text-muted">Đăng nhập bằng tài khoản Studio do AI Cinema cấp.</p>
        </div>
        <LoginForm notice={expired ? 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.' : undefined} />
      </div>
    </main>
  );
}
