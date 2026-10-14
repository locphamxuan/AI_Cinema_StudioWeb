import { createHash, timingSafeEqual } from 'node:crypto';

export const ACCESS_COOKIE = 'studio_access';

const digest = (value: string) => createHash('sha256').update(value).digest();

/** The cookie value that proves the visitor knew the access code: a hash, never the code itself. */
export function accessToken(code: string): string {
  return digest(`studio-web:${code}`).toString('hex');
}

/** True when no code is required, or the cookie proves the code. */
export function hasAccess(accessCode: string, cookie: string | undefined): boolean {
  if (!accessCode) return true;
  if (!cookie) return false;
  const expected = Buffer.from(accessToken(accessCode));
  const given = Buffer.from(cookie);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function codeMatches(accessCode: string, submitted: string): boolean {
  const a = digest(accessCode);
  const b = digest(submitted);
  return timingSafeEqual(a, b);
}
