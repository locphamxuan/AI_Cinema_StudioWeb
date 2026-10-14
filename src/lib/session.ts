import { cookies } from 'next/headers';
import { ACCESS_COOKIE, hasAccess } from './access';
import { getConfig } from './config';
import { StudioError } from './studio';

/** Whether this visitor may use the site: always when no access code is set, else only with the cookie. */
export async function visitorHasAccess(): Promise<boolean> {
  const store = await cookies();
  return hasAccess(getConfig().accessCode, store.get(ACCESS_COOKIE)?.value);
}

/** For route handlers: refuses a visitor without access. */
export async function requireAccess(): Promise<void> {
  if (!(await visitorHasAccess())) throw new StudioError(401, 'Cần nhập mã truy cập của Studio.');
}

/** Turns what a handler threw into the JSON answer the page shows. */
export function errorResponse(error: unknown): Response {
  if (error instanceof StudioError) return Response.json({ error: error.message }, { status: error.status });
  const message = error instanceof Error ? error.message : 'Lỗi không xác định.';
  return Response.json({ error: message }, { status: 500 });
}
