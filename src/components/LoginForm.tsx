'use client';

import { useActionState } from 'react';
import { LogIn } from 'lucide-react';
import { login, type LoginState } from '@/app/actions/auth';
import { BUTTON, ErrorCard, INPUT } from './ui';

export function LoginForm({ notice }: { notice?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="space-y-4">
      {state.error ? <ErrorCard message={state.error} /> : notice && <ErrorCard message={notice} />}
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state.email}
          className={INPUT}
          placeholder="studio@aicinema.com"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Mật khẩu</span>
        <input name="password" type="password" autoComplete="current-password" required className={INPUT} />
      </label>
      <button type="submit" disabled={pending} className={`${BUTTON} w-full`}>
        <LogIn className="h-4 w-4" aria-hidden="true" />
        {pending ? 'Đang đăng nhập…' : 'Đăng nhập'}
      </button>
    </form>
  );
}
