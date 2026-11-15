'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getConfig } from '@/lib/config';
import { ApiError, describeError } from '@/lib/api/http';
import { authApi, oauthApi } from '@/lib/api/portal';
import { LOGIN_PATH } from '@/lib/session/paths';
import { clearSession, saveSession } from '@/lib/session/server';
import { COOKIE, isStudio, kindOf, NOT_STUDIO_MESSAGE } from '@/lib/session/tokens';

export interface LoginState {
  error?: string;
  email?: string;
}

/** Logs in with an AI Cinema account; only STUDIO accounts may use this site. */
export async function login(_previous: LoginState, form: FormData): Promise<LoginState> {
  if (!getConfig().passwordLogin) return { error: 'Vui lòng đăng nhập bằng tài khoản AI Cinema.' };
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!email || !password) return { error: 'Vui lòng nhập email và mật khẩu.', email };

  const api = authApi(getConfig().apiUrl);
  try {
    const session = await api.login(email, password);
    if (!isStudio(session.user)) {
      // Do not leave a live session of a non-studio account behind.
      await api.logout(session.refreshToken).catch(() => undefined);
      return { error: NOT_STUDIO_MESSAGE, email };
    }
    await saveSession(session);
  } catch (error) {
    const wrongCredentials = error instanceof ApiError && error.status === 401;
    return { error: wrongCredentials ? 'Email hoặc mật khẩu không đúng.' : describeError(error), email };
  }
  redirect('/');
}

export async function logout(): Promise<void> {
  const store = await cookies();
  const refresh = store.get(COOKIE.refresh)?.value;
  if (refresh) {
    const config = getConfig();
    const ending =
      kindOf(store.get(COOKIE.kind)?.value) === 'oauth'
        ? oauthApi(config.apiUrl, config.oauth).revoke(refresh)
        : authApi(config.apiUrl).logout(refresh);
    await ending.catch(() => undefined);
  }
  await clearSession();
  redirect(LOGIN_PATH);
}
