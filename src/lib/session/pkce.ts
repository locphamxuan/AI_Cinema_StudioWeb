import { createHash, randomBytes } from 'node:crypto';
import type { OAuthSettings } from '@/lib/config';

/** The short-lived cookie that carries `state` and the PKCE verifier from /api/auth/login to the callback. */
export const OAUTH_COOKIE = 'sw_oauth';
export const OAUTH_COOKIE_MAX_AGE_SECONDS = 10 * 60;

const base64url = (bytes: Buffer) => bytes.toString('base64url');

/** RFC 7636 §4.1: 32 random bytes give a 43-character verifier. */
export const newVerifier = () => base64url(randomBytes(32));

/** RFC 7636 §4.2, S256. */
export const challengeOf = (verifier: string) => base64url(createHash('sha256').update(verifier).digest());

export const newState = () => base64url(randomBytes(16));

export interface PendingLogin {
  state: string;
  verifier: string;
}

export function readPending(value: string | undefined): PendingLogin | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<PendingLogin>;
    return typeof parsed.state === 'string' && typeof parsed.verifier === 'string'
      ? { state: parsed.state, verifier: parsed.verifier }
      : null;
  } catch {
    return null;
  }
}

/** The consent screen URL (RFC 6749 §4.1.1 + RFC 7636 §4.3). */
export function authorizeUrl(oauth: OAuthSettings, pending: PendingLogin): string {
  const url = new URL(oauth.authorizeUrl);
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: oauth.clientId,
    redirect_uri: oauth.redirectUri,
    scope: oauth.scope,
    state: pending.state,
    code_challenge: challengeOf(pending.verifier),
    code_challenge_method: 'S256',
  }).toString();
  return url.toString();
}
