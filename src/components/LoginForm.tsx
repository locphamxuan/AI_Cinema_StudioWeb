'use client';

import { useActionState } from 'react';
import { LogIn } from 'lucide-react';
import { login, type LoginState } from '@/app/actions/auth';
import { BUTTON, ErrorCard, INPUT } from './ui';

const LOGIN_INPUT = `${INPUT} rounded-full px-4 py-2.5`;

export function LoginForm({ notice }: { notice?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="space-y-4">
      {state.error ? <ErrorCard message={state.error} /> : notice && <ErrorCard message={notice} />}
      <label className="block space-y-1.5 text-sm">
        <span className="block text-xs font-semibold text-muted">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state.email}
          className={LOGIN_INPUT}
          placeholder="studio@aicinema.com"
        />
      </label>
      <label className="block space-y-1.5 text-sm">
        <span className="block text-xs font-semibold text-muted">Mật khẩu</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={LOGIN_INPUT}
          placeholder="••••••••"
        />
      </label>
      <button type="submit" disabled={pending} className={`${BUTTON} mt-2 w-full py-3`}>
        <LogIn className="h-4 w-4" aria-hidden="true" />
        {pending ? 'Đang đăng nhập…' : 'Đăng nhập'}
      </button>
    </form>
  );
}
